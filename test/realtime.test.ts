// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AttemptFailedError,
  connectRealtimeAttempt,
  type AttemptActivity,
} from '../src/client/realtime.js';

const clientSecretUrl = '/api/realtime/client-secret';
const rawEventLogUrl = '/api/attempts/raw-event-log';
const realtimeCallsUrl = 'https://api.openai.com/v1/realtime/calls';

class FakeDataChannel extends EventTarget {
  readyState: 'connecting' | 'open' | 'closed' = 'connecting';
  readonly sent: string[] = [];

  send(data: string) {
    this.sent.push(data);
  }

  open() {
    this.readyState = 'open';
    this.dispatchEvent(new Event('open'));
  }

  close() {
    if (this.readyState === 'closed') {
      return;
    }

    this.readyState = 'closed';
    this.dispatchEvent(new Event('close'));
  }

  deliver(serverEvent: unknown) {
    this.dispatchEvent(
      new MessageEvent('message', {
        data:
          typeof serverEvent === 'string'
            ? serverEvent
            : JSON.stringify(serverEvent),
      })
    );
  }
}

class FakePeerConnection extends EventTarget {
  static latest: FakePeerConnection | undefined;

  connectionState = 'new';
  dataChannel: FakeDataChannel | undefined;
  remoteSdp: string | undefined;
  closed = false;
  readonly addedTracks: unknown[] = [];

  constructor() {
    super();
    FakePeerConnection.latest = this;
  }

  createDataChannel() {
    const channel = new FakeDataChannel();
    this.dataChannel = channel;
    queueMicrotask(() => channel.open());

    return channel;
  }

  addTrack(track: unknown) {
    this.addedTracks.push(track);
  }

  createOffer() {
    return Promise.resolve({ type: 'offer', sdp: 'local-offer-sdp' });
  }

  setLocalDescription() {
    return Promise.resolve();
  }

  setRemoteDescription(description: { sdp: string }) {
    this.remoteSdp = description.sdp;

    return Promise.resolve();
  }

  close() {
    this.closed = true;
    this.connectionState = 'closed';
  }
}

class FakeAudio {
  autoplay = false;
  srcObject: unknown = null;
  paused = false;

  pause() {
    this.paused = true;
  }
}

function createMicrophone() {
  const track = { kind: 'audio', stop: vi.fn() };
  const stream = {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  };

  return { stream: stream as unknown as MediaStream, track };
}

type BrowserStubOptions = {
  getUserMedia?: () => Promise<MediaStream>;
  requestLog?: string[];
  rawEventLogOk?: boolean;
  clientSecretOk?: boolean;
  clientSecretBody?: unknown;
  sdpOk?: boolean;
};

function stubBrowser(options: BrowserStubOptions = {}) {
  const microphone = createMicrophone();
  const getUserMedia = vi.fn(
    options.getUserMedia ??
      (() => {
        options.requestLog?.push('microphone');

        return Promise.resolve(microphone.stream);
      })
  );

  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });

  const fetchMock = vi.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    options.requestLog?.push(url);

    if (url === clientSecretUrl) {
      return Promise.resolve({
        ok: options.clientSecretOk ?? true,
        json: () =>
          Promise.resolve(
            options.clientSecretBody ?? {
              value: 'ephemeral-credential',
              expiresAt: 1_750_000_000,
            }
          ),
      } as unknown as Response);
    }

    if (url === realtimeCallsUrl) {
      return Promise.resolve({
        ok: options.sdpOk ?? true,
        text: () => Promise.resolve('remote-answer-sdp'),
        requestInit: init,
      } as unknown as Response);
    }

    if (url === rawEventLogUrl) {
      return Promise.resolve({
        ok: options.rawEventLogOk ?? true,
      } as unknown as Response);
    }

    throw new Error(`Unexpected request to ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
  vi.stubGlobal('Audio', FakeAudio);

  return { fetchMock, getUserMedia, microphone };
}

function rawEventLogRequestBody(
  fetchMock: ReturnType<typeof stubBrowser>['fetchMock']
): string {
  const body = fetchMock.mock.calls.find(([url]) => url === rawEventLogUrl)?.[1]
    ?.body;

  if (typeof body !== 'string') {
    throw new Error('The raw event log request did not contain a text body.');
  }

  return body;
}

function startAttempt() {
  const controller = new AbortController();
  const onActivity = vi.fn<(activity: AttemptActivity) => void>();
  const onAttemptDataFailed = vi.fn();
  const onEnded = vi.fn();
  const attempt = connectRealtimeAttempt({
    signal: controller.signal,
    onActivity,
    onEnded,
    onAttemptDataFailed,
  });

  return {
    attempt,
    controller,
    onActivity,
    onAttemptDataFailed,
    onEnded,
  };
}

function liveDataChannel(): FakeDataChannel {
  const channel = FakePeerConnection.latest?.dataChannel;

  if (!channel) {
    throw new Error('The Attempt never opened a data channel.');
  }

  return channel;
}

function settleEmptyStopCommands(channel: FakeDataChannel) {
  const stopCommands = channel.sent
    .map((event) => JSON.parse(event) as Record<string, unknown>)
    .filter(
      (event) =>
        typeof event.event_id === 'string' &&
        event.event_id.startsWith('conversation_practice_stop_')
    );

  for (const command of stopCommands) {
    channel.deliver({
      type: 'error',
      error: {
        event_id: command.event_id,
        message: 'There was no buffered input or active response.',
      },
    });
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(globalThis.navigator, 'mediaDevices');
  FakePeerConnection.latest = undefined;
});

describe('opening a live Attempt', () => {
  it('opens the microphone before minting the short-lived credential', async () => {
    const requestLog: string[] = [];
    stubBrowser({ requestLog });

    await startAttempt().attempt;

    expect(requestLog).toEqual([
      'microphone',
      clientSecretUrl,
      realtimeCallsUrl,
    ]);
  });

  it('reaches OpenAI with the ephemeral credential and never an API key', async () => {
    const { fetchMock } = stubBrowser();

    await startAttempt().attempt;

    const [secretUrl, secretInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(secretUrl).toBe(clientSecretUrl);
    expect(secretInit.method).toBe('POST');

    const [callsUrl, callsInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(callsUrl).toBe(realtimeCallsUrl);
    expect(callsInit.body).toBe('local-offer-sdp');
    expect(callsInit.headers).toMatchObject({
      Authorization: 'Bearer ephemeral-credential',
      'Content-Type': 'application/sdp',
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('sk-');
    expect(FakePeerConnection.latest?.remoteSdp).toBe('remote-answer-sdp');
  });

  it('sends the Trainee audio and asks the Persona to speak first', async () => {
    const { microphone } = stubBrowser();

    await startAttempt().attempt;

    expect(FakePeerConnection.latest?.addedTracks).toEqual([microphone.track]);
    const sentEvents = liveDataChannel().sent.map(
      (event) => JSON.parse(event) as unknown
    );
    expect(sentEvents).toEqual([
      { type: 'response.create', response: { output_modalities: ['audio'] } },
    ]);
  });
});

describe('a live Attempt in progress', () => {
  it('asks the Persona model for isolated text for each Trainee turn', async () => {
    stubBrowser();
    const { attempt } = startAttempt();
    await attempt;

    const channel = liveDataChannel();
    channel.deliver({
      type: 'conversation.item.done',
      previous_item_id: null,
      item: {
        id: 'trainee-turn',
        type: 'message',
        status: 'completed',
        role: 'user',
        content: [{ type: 'input_audio' }],
      },
    });

    const sentEvents = channel.sent.map(
      (event) => JSON.parse(event) as Record<string, unknown>
    );

    expect(sentEvents.slice(1)).toEqual([
      {
        event_id: 'conversation_practice_turn_transcription_1',
        type: 'response.create',
        response: {
          conversation: 'none',
          output_modalities: ['text'],
          instructions:
            'Transcribe the referenced spoken turn. Return only the words that were spoken.',
          input: [{ type: 'item_reference', id: 'trainee-turn' }],
          metadata: {
            purpose: 'turn_transcription',
            source_item_id: 'trainee-turn',
          },
          tools: [],
          tool_choice: 'none',
        },
      },
    ]);
  });

  it('leaves a Persona turn to its own audio transcript', async () => {
    stubBrowser();
    const { attempt } = startAttempt();
    await attempt;

    const channel = liveDataChannel();
    // The text the Persona's audio was generated from arrives unasked, from the
    // same model. Asking for it a second time returned nothing about half the
    // time, so the Persona's turns are never transcribed out of band.
    channel.deliver({
      type: 'response.output_audio_transcript.done',
      item_id: 'persona-turn',
      transcript: "I'd like to close my account.",
    });
    channel.deliver({
      type: 'conversation.item.done',
      previous_item_id: null,
      item: {
        id: 'persona-turn',
        type: 'message',
        status: 'completed',
        role: 'assistant',
        content: [{ type: 'output_audio' }],
      },
    });

    const sentEvents = channel.sent.map(
      (event) => JSON.parse(event) as Record<string, unknown>
    );
    expect(sentEvents).toEqual([
      { type: 'response.create', response: { output_modalities: ['audio'] } },
    ]);
  });

  it('does not react to an out-of-band transcription or emit extra audio', async () => {
    stubBrowser();
    const { attempt } = startAttempt();
    await attempt;

    const channel = liveDataChannel();
    channel.deliver({
      type: 'response.created',
      response: {
        id: 'transcription-response',
        conversation_id: null,
        output_modalities: ['text'],
        metadata: {
          purpose: 'turn_transcription',
          source_item_id: 'trainee-turn',
        },
      },
    });
    channel.deliver({
      type: 'response.output_text.done',
      response_id: 'transcription-response',
      item_id: 'transcription-item',
      text: 'I need to understand what happened.',
    });
    channel.deliver({
      type: 'response.done',
      response: {
        id: 'transcription-response',
        conversation_id: null,
        output_modalities: ['text'],
        metadata: {
          purpose: 'turn_transcription',
          source_item_id: 'trainee-turn',
        },
      },
    });

    const sentEvents = channel.sent.map(
      (event) => JSON.parse(event) as Record<string, unknown>
    );
    expect(sentEvents).toEqual([
      { type: 'response.create', response: { output_modalities: ['audio'] } },
    ]);
  });

  it('never transcribes the output of a transcription', async () => {
    stubBrowser();
    const { attempt } = startAttempt();
    await attempt;

    const channel = liveDataChannel();
    // A completed out-of-band transcription reports its own output item as a
    // completed assistant message. Both shapes below came off a real Attempt:
    // one carrying the transcript text, one carrying nothing at all.
    channel.deliver({
      type: 'conversation.item.done',
      previous_item_id: null,
      item: {
        id: 'transcription-output-with-text',
        type: 'message',
        status: 'completed',
        role: 'assistant',
        content: [
          { type: 'output_text', text: "I'd like to close my account." },
        ],
        phase: 'final_answer',
      },
    });
    channel.deliver({
      type: 'conversation.item.done',
      previous_item_id: null,
      item: {
        id: 'transcription-output-empty',
        type: 'message',
        status: 'completed',
        role: 'assistant',
        content: [],
        phase: 'final_answer',
      },
    });

    const sentEvents = channel.sent.map(
      (event) => JSON.parse(event) as Record<string, unknown>
    );
    expect(sentEvents).toEqual([
      { type: 'response.create', response: { output_modalities: ['audio'] } },
    ]);
  });

  it('reports when the Persona starts and stops speaking', async () => {
    stubBrowser();
    const { attempt, onActivity } = startAttempt();
    await attempt;

    const channel = liveDataChannel();

    channel.deliver({ type: 'output_audio_buffer.started' });
    expect(onActivity).toHaveBeenLastCalledWith('speaking');

    channel.deliver({ type: 'output_audio_buffer.stopped' });
    expect(onActivity).toHaveBeenLastCalledWith('listening');

    channel.deliver({ type: 'output_audio_buffer.started' });
    channel.deliver({ type: 'output_audio_buffer.cleared' });
    expect(onActivity).toHaveBeenLastCalledWith('listening');
    expect(onActivity).toHaveBeenCalledTimes(4);
  });

  it('ignores unreadable and unrelated events from the session', async () => {
    stubBrowser();
    const { attempt, onActivity } = startAttempt();
    await attempt;

    const channel = liveDataChannel();

    channel.deliver('not json at all');
    channel.deliver({ type: 'response.done' });
    channel.deliver({ noTypeAtAll: true });

    expect(onActivity).not.toHaveBeenCalled();
  });

  it('forwards the complete raw event log when the Trainee stops', async () => {
    const { fetchMock } = stubBrowser();
    const { attempt } = startAttempt();
    const liveAttempt = await attempt;
    const channel = liveDataChannel();
    const identifierEvent = {
      event_id: 'event-committed',
      type: 'test.identifier-bearing-event',
      item_id: 'trainee-turn',
      previous_item_id: 'persona-turn',
      future_api_field: { retained: true },
    };
    const textEvent = {
      event_id: 'event-text',
      type: 'response.output_text.done',
      response_id: 'transcription-response',
      item_id: 'transcription-item',
      text: 'What happened?',
    };

    channel.deliver(identifierEvent);
    channel.deliver(textEvent);
    liveAttempt.stop();
    settleEmptyStopCommands(channel);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        rawEventLogUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            {
              direction: 'client',
              event: JSON.stringify({
                type: 'response.create',
                response: { output_modalities: ['audio'] },
              }),
            },
            { direction: 'server', event: JSON.stringify(identifierEvent) },
            { direction: 'server', event: JSON.stringify(textEvent) },
            ...channel.sent.slice(-3).map((event) => ({
              direction: 'client' as const,
              event,
            })),
            ...channel.sent.slice(-3).map((event) => {
              const command = JSON.parse(event) as Record<string, unknown>;

              return {
                direction: 'server' as const,
                event: JSON.stringify({
                  type: 'error',
                  error: {
                    event_id: command.event_id,
                    message: 'There was no buffered input or active response.',
                  },
                }),
              };
            }),
          ]),
        })
      );
    });
    const rawEventLogRequest = fetchMock.mock.calls.find(
      ([url]) => url === rawEventLogUrl
    )?.[1];
    expect(rawEventLogRequest).not.toHaveProperty('keepalive');
  });

  it('forwards event logs larger than the keepalive request limit', async () => {
    const { fetchMock } = stubBrowser();
    const { attempt } = startAttempt();
    const liveAttempt = await attempt;

    liveDataChannel().deliver({
      type: 'response.output_audio_transcript.delta',
      item_id: 'persona-turn',
      delta: 'x'.repeat(70_000),
    });
    liveAttempt.stop();
    settleEmptyStopCommands(liveDataChannel());

    await vi.waitFor(() => {
      const rawEventLogBody = rawEventLogRequestBody(fetchMock);

      expect(rawEventLogBody.length).toBeGreaterThan(65_536);
      const rawEventLogRequest = fetchMock.mock.calls.find(
        ([url]) => url === rawEventLogUrl
      )?.[1];
      expect(rawEventLogRequest).not.toHaveProperty('keepalive');
    });
  });

  it('keeps unreadable text and binary data-channel messages in the raw log', async () => {
    const { fetchMock } = stubBrowser();
    const { attempt } = startAttempt();
    const liveAttempt = await attempt;
    const channel = liveDataChannel();
    const binaryEvent = new Uint8Array([0, 255, 17, 34]).buffer;

    channel.deliver('not json at all');
    channel.dispatchEvent(new MessageEvent('message', { data: binaryEvent }));
    liveAttempt.stop();
    settleEmptyStopCommands(channel);

    await vi.waitFor(() => {
      const entries = JSON.parse(
        rawEventLogRequestBody(fetchMock)
      ) as unknown[];

      expect(entries).toEqual(
        expect.arrayContaining([
          {
            direction: 'client',
            event: JSON.stringify({
              type: 'response.create',
              response: { output_modalities: ['audio'] },
            }),
          },
          { direction: 'server', event: 'not json at all' },
          { direction: 'server', binary: 'AP8RIg==' },
        ])
      );
    });
  });

  it('does not discard a pending turn transcription when the Trainee stops', async () => {
    const { fetchMock, microphone } = stubBrowser();
    const { attempt } = startAttempt();
    const liveAttempt = await attempt;
    const channel = liveDataChannel();
    const completedTurnEvent = {
      type: 'conversation.item.done',
      previous_item_id: 'persona-turn',
      item: {
        id: 'trainee-turn',
        type: 'message',
        status: 'completed',
        role: 'user',
        content: [{ type: 'input_audio' }],
      },
    };
    const transcriptionDoneEvent = {
      type: 'response.done',
      response: {
        id: 'transcription-response',
        status: 'completed',
        conversation_id: null,
        output_modalities: ['text'],
        metadata: {
          purpose: 'turn_transcription',
          source_item_id: 'trainee-turn',
        },
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'I need to understand what happened.',
              },
            ],
          },
        ],
      },
    };

    channel.deliver(completedTurnEvent);
    liveAttempt.stop();

    expect(microphone.track.stop).toHaveBeenCalledOnce();
    expect(FakePeerConnection.latest?.closed).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => url === rawEventLogUrl)).toBe(
      false
    );

    channel.deliver(transcriptionDoneEvent);
    settleEmptyStopCommands(channel);

    await vi.waitFor(() => {
      const entries = JSON.parse(rawEventLogRequestBody(fetchMock)) as Array<{
        direction: string;
        event?: string;
      }>;

      expect(entries).toEqual(
        expect.arrayContaining([
          {
            direction: 'server',
            event: JSON.stringify(completedTurnEvent),
          },
          {
            direction: 'server',
            event: JSON.stringify(transcriptionDoneEvent),
          },
        ])
      );
    });
    expect(FakePeerConnection.latest?.closed).toBe(true);
  });

  it('waits for the in-flight Persona turn to land before forwarding a stop', async () => {
    const { fetchMock, microphone } = stubBrowser();
    const { attempt } = startAttempt();
    const liveAttempt = await attempt;
    const channel = liveDataChannel();

    channel.deliver({
      type: 'response.created',
      response: {
        id: 'persona-response',
        conversation_id: 'default-conversation',
        metadata: null,
      },
    });
    liveAttempt.stop();

    expect(microphone.track.stop).toHaveBeenCalledOnce();
    expect(FakePeerConnection.latest?.closed).toBe(false);

    const stopEvents = channel.sent
      .map((event) => JSON.parse(event) as Record<string, unknown>)
      .slice(-3);
    expect(stopEvents.map(({ type }) => type)).toEqual([
      'input_audio_buffer.commit',
      'response.cancel',
      'output_audio_buffer.clear',
    ]);

    const commitEventId = stopEvents[0]?.event_id;
    channel.deliver({
      type: 'error',
      error: {
        event_id: commitEventId,
        message: 'The input audio buffer is empty.',
      },
    });
    channel.deliver({
      type: 'response.done',
      response: {
        id: 'persona-response',
        status: 'cancelled',
        conversation_id: 'default-conversation',
        metadata: null,
        output: [],
      },
    });
    channel.deliver({ type: 'output_audio_buffer.cleared' });

    // The cut-off turn's own text and its item both arrive after the cancel,
    // and both have to reach the server rather than be closed out from under.
    const partialPersonaTranscript = {
      type: 'response.output_audio_transcript.done',
      item_id: 'persona-turn',
      transcript: 'I was explaining why I am leaving.',
    };
    const partialPersonaTurn = {
      type: 'conversation.item.done',
      previous_item_id: 'trainee-turn',
      item: {
        id: 'persona-turn',
        type: 'message',
        status: 'incomplete',
        role: 'assistant',
        content: [{ type: 'output_audio' }],
      },
    };
    channel.deliver(partialPersonaTranscript);
    channel.deliver(partialPersonaTurn);

    await vi.waitFor(() => {
      const entries = JSON.parse(rawEventLogRequestBody(fetchMock)) as Array<{
        event?: string;
      }>;

      expect(entries).toContainEqual(
        expect.objectContaining({
          event: JSON.stringify(partialPersonaTranscript),
        })
      );
      expect(entries).toContainEqual(
        expect.objectContaining({ event: JSON.stringify(partialPersonaTurn) })
      );
    });
    expect(FakePeerConnection.latest?.closed).toBe(true);
    expect(
      channel.sent.some((event) => event.includes('turn_transcription'))
    ).toBe(false);
  });

  it('commits and transcribes buffered Trainee speech before forwarding a stop', async () => {
    const { fetchMock } = stubBrowser();
    const { attempt } = startAttempt();
    const liveAttempt = await attempt;
    const channel = liveDataChannel();

    liveAttempt.stop();

    const stopCommands = channel.sent
      .map((event) => JSON.parse(event) as Record<string, unknown>)
      .slice(-3);
    const [commitCommand, cancelCommand, clearCommand] = stopCommands;
    const committedEvent = {
      type: 'input_audio_buffer.committed',
      item_id: 'buffered-trainee-turn',
      previous_item_id: 'persona-turn',
    };
    channel.deliver(committedEvent);
    channel.deliver({
      type: 'error',
      error: {
        event_id: cancelCommand?.event_id,
        message: 'There is no active response to cancel.',
      },
    });
    channel.deliver({
      type: 'error',
      error: {
        event_id: clearCommand?.event_id,
        message: 'There is no output audio buffer to clear.',
      },
    });
    expect(commitCommand?.type).toBe('input_audio_buffer.commit');
    expect(FakePeerConnection.latest?.closed).toBe(false);

    const traineeTurnDone = {
      type: 'conversation.item.done',
      previous_item_id: 'persona-turn',
      item: {
        id: 'buffered-trainee-turn',
        type: 'message',
        status: 'completed',
        role: 'user',
        content: [{ type: 'input_audio' }],
      },
    };
    channel.deliver(traineeTurnDone);
    channel.deliver({
      type: 'response.done',
      response: {
        id: 'buffered-turn-transcription',
        status: 'completed',
        conversation_id: null,
        metadata: {
          purpose: 'turn_transcription',
          source_item_id: 'buffered-trainee-turn',
        },
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'I need to know what happened.',
              },
            ],
          },
        ],
      },
    });

    await vi.waitFor(() => {
      const entries = JSON.parse(rawEventLogRequestBody(fetchMock)) as Array<{
        event?: string;
      }>;

      expect(entries).toContainEqual({
        direction: 'server',
        event: JSON.stringify(committedEvent),
      });
      expect(entries).toContainEqual({
        direction: 'server',
        event: JSON.stringify(traineeTurnDone),
      });
    });
  });

  it('surfaces a rejected raw event log upload', async () => {
    stubBrowser({ rawEventLogOk: false });
    const { attempt, onAttemptDataFailed } = startAttempt();

    const liveAttempt = await attempt;
    liveAttempt.stop();
    settleEmptyStopCommands(liveDataChannel());

    await vi.waitFor(() => {
      expect(onAttemptDataFailed).toHaveBeenCalledOnce();
    });
  });

  it('does not wait for the timeout when a transcription request is rejected', async () => {
    stubBrowser();
    const { attempt, onAttemptDataFailed } = startAttempt();
    const liveAttempt = await attempt;
    const channel = liveDataChannel();

    channel.deliver({
      type: 'conversation.item.done',
      previous_item_id: null,
      item: {
        id: 'trainee-turn',
        type: 'message',
        status: 'completed',
        role: 'user',
        content: [{ type: 'input_audio' }],
      },
    });
    const transcriptionRequest = JSON.parse(
      channel.sent.at(-1) ?? ''
    ) as Record<string, unknown>;
    expect(transcriptionRequest.event_id).toEqual(expect.any(String));

    channel.deliver({
      type: 'error',
      error: {
        event_id: transcriptionRequest.event_id,
        message: 'The transcription response was rejected.',
      },
    });
    liveAttempt.stop();
    settleEmptyStopCommands(channel);

    await vi.waitFor(() => {
      expect(onAttemptDataFailed).toHaveBeenCalledOnce();
    });
  });

  it('ends cleanly when a stop in silence is met with silence', async () => {
    const { fetchMock } = stubBrowser();
    const { attempt, onAttemptDataFailed } = startAttempt();
    const liveAttempt = await attempt;
    const channel = liveDataChannel();

    liveAttempt.stop();

    // Stopping with nothing buffered and nothing playing: the session refuses
    // the commit and the cancel, and answers the clear with nothing at all.
    const stopCommands = channel.sent
      .map((event) => JSON.parse(event) as Record<string, unknown>)
      .filter(
        (event) =>
          typeof event.event_id === 'string' &&
          event.event_id.startsWith('conversation_practice_stop_')
      );
    expect(stopCommands.map(({ type }) => type)).toEqual([
      'input_audio_buffer.commit',
      'response.cancel',
      'output_audio_buffer.clear',
    ]);

    for (const command of stopCommands.slice(0, 2)) {
      channel.deliver({
        type: 'error',
        error: { event_id: command.event_id, code: 'not_active' },
      });
    }

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(rawEventLogUrl, expect.anything());
    });
    expect(onAttemptDataFailed).not.toHaveBeenCalled();
    expect(FakePeerConnection.latest?.closed).toBe(true);
  });

  it('does not report a settled log as incomplete at the stop deadline', async () => {
    vi.useFakeTimers();
    const { fetchMock } = stubBrowser();
    const { attempt, onAttemptDataFailed } = startAttempt();
    const liveAttempt = await attempt;
    const channel = liveDataChannel();

    liveAttempt.stop();
    settleEmptyStopCommands(channel);
    const keepReceivingSettledEvents = setInterval(() => {
      channel.deliver({ type: 'rate_limits.updated' });
    }, 100);

    await vi.advanceTimersByTimeAsync(15_000);
    clearInterval(keepReceivingSettledEvents);

    expect(onAttemptDataFailed).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([url]) => url === rawEventLogUrl)).toBe(
      true
    );
  });

  it('surfaces and forwards an incomplete log at the stop deadline', async () => {
    vi.useFakeTimers();
    const { fetchMock } = stubBrowser();
    const { attempt, onAttemptDataFailed } = startAttempt();
    const liveAttempt = await attempt;

    liveAttempt.stop();
    await vi.advanceTimersByTimeAsync(15_000);

    expect(onAttemptDataFailed).toHaveBeenCalledOnce();
    expect(FakePeerConnection.latest?.closed).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => url === rawEventLogUrl)).toBe(
      true
    );
  });

  it('ends the Attempt when the line drops unexpectedly', async () => {
    const { microphone } = stubBrowser();
    const { attempt, onEnded } = startAttempt();
    await attempt;

    liveDataChannel().close();

    expect(onEnded).toHaveBeenCalledOnce();
    expect(microphone.track.stop).toHaveBeenCalled();
    expect(FakePeerConnection.latest?.closed).toBe(true);
  });

  it('releases the microphone on stop without reporting an unexpected end', async () => {
    const { microphone } = stubBrowser();
    const { attempt, onEnded } = startAttempt();

    const liveAttempt = await attempt;
    liveAttempt.stop();
    settleEmptyStopCommands(liveDataChannel());

    expect(microphone.track.stop).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(FakePeerConnection.latest?.closed).toBe(true);
    });
    expect(onEnded).not.toHaveBeenCalled();
  });
});

describe('an Attempt that cannot start', () => {
  it('explains a refused microphone and never mints a credential', async () => {
    const { fetchMock } = stubBrowser({
      getUserMedia: () =>
        Promise.reject(new DOMException('Denied', 'NotAllowedError')),
    });

    await expect(startAttempt().attempt).rejects.toThrow(AttemptFailedError);
    await expect(startAttempt().attempt).rejects.toThrow(/microphone access/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains a missing microphone separately from a refused one', async () => {
    stubBrowser({
      getUserMedia: () =>
        Promise.reject(new DOMException('None', 'NotFoundError')),
    });

    await expect(startAttempt().attempt).rejects.toThrow(
      /No microphone was found/
    );
  });

  it('releases the microphone when the credential cannot be minted', async () => {
    const { microphone } = stubBrowser({ clientSecretOk: false });

    await expect(startAttempt().attempt).rejects.toThrow(AttemptFailedError);
    expect(microphone.track.stop).toHaveBeenCalled();
  });

  it('releases the microphone when OpenAI refuses the offer', async () => {
    const { microphone } = stubBrowser({ sdpOk: false });

    await expect(startAttempt().attempt).rejects.toThrow(/could not be opened/);
    expect(microphone.track.stop).toHaveBeenCalled();
    expect(FakePeerConnection.latest?.closed).toBe(true);
  });

  it('rejects a credential the server did not shape correctly', async () => {
    stubBrowser({ clientSecretBody: { value: 'no-expiry' } });

    await expect(startAttempt().attempt).rejects.toThrow(/invalid credential/);
  });

  it('stops quietly when the Trainee aborts before the line opens', async () => {
    const { microphone } = stubBrowser();
    const { attempt, controller, onEnded } = startAttempt();
    controller.abort();

    await expect(attempt).rejects.toMatchObject({ name: 'AbortError' });
    expect(microphone.track.stop).toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
  });
});
