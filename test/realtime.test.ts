// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AttemptFailedError,
  connectRealtimeAttempt,
  type AttemptActivity,
} from '../src/client/realtime.js';

const clientSecretUrl = '/api/realtime/client-secret';
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

    throw new Error(`Unexpected request to ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
  vi.stubGlobal('Audio', FakeAudio);

  return { fetchMock, getUserMedia, microphone };
}

function startAttempt() {
  const controller = new AbortController();
  const onActivity = vi.fn<(activity: AttemptActivity) => void>();
  const onEnded = vi.fn();
  const attempt = connectRealtimeAttempt({
    signal: controller.signal,
    onActivity,
    onEnded,
  });

  return { attempt, controller, onActivity, onEnded };
}

function liveDataChannel(): FakeDataChannel {
  const channel = FakePeerConnection.latest?.dataChannel;

  if (!channel) {
    throw new Error('The Attempt never opened a data channel.');
  }

  return channel;
}

afterEach(() => {
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

    (await attempt).stop();

    expect(microphone.track.stop).toHaveBeenCalledOnce();
    expect(FakePeerConnection.latest?.closed).toBe(true);
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
