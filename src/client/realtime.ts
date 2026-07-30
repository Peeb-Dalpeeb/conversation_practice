import { personaHangUpToolName } from '../realtime-protocol.js';

export type AttemptActivity = 'listening' | 'speaking';

export type RealtimeAttempt = {
  stop(): void;
};

export type CompletedAttempt = {
  scenarioId: string;
  number: number;
  feedback:
    | {
        status: 'completed';
        prose: string;
      }
    | {
        status: 'failed';
        error: string;
      };
};

type ConnectRealtimeAttemptOptions = {
  signal: AbortSignal;
  onActivity: (activity: AttemptActivity) => void;
  onAttemptEnding: () => void;
  onEnded: () => void;
  onAttemptDataFailed: () => void;
  onAttemptJudgingFailed: () => void;
  onJudgingStarted: () => void;
  onAttemptCompleted: (attempt: CompletedAttempt) => void;
};

export type ConnectRealtimeAttempt = (
  options: ConnectRealtimeAttemptOptions
) => Promise<RealtimeAttempt>;

type ClientSecretResponse = {
  value: string;
  expiresAt: number;
};

type RawRealtimeEvent =
  | {
      direction: 'client' | 'server';
      event: string;
    }
  | {
      direction: 'server';
      binary: string;
    };

async function completedAttemptFromResponse(
  response: Response
): Promise<CompletedAttempt> {
  const attempt: unknown = await response.json();

  if (
    !isRecord(attempt) ||
    typeof attempt.scenarioId !== 'string' ||
    !Number.isInteger(attempt.number) ||
    !isRecord(attempt.feedback) ||
    !(
      (attempt.feedback.status === 'completed' &&
        typeof attempt.feedback.prose === 'string') ||
      (attempt.feedback.status === 'failed' &&
        typeof attempt.feedback.error === 'string')
    )
  ) {
    throw new TypeError('The completed Attempt response was invalid.');
  }

  return attempt as CompletedAttempt;
}

async function completionFailureCode(
  response: Response
): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    return isRecord(body) && typeof body.code === 'string'
      ? body.code
      : undefined;
  } catch {
    return undefined;
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolveWait) => {
    setTimeout(resolveWait, milliseconds);
  });
}

const attemptRecoveryIntervalMs = 1_000;
const attemptRecoveryTimeoutMs = 20_000;
const attemptHardCapMs = 12 * 60 * 1_000;

async function readLatestCompletedAttempt(): Promise<
  CompletedAttempt | undefined
> {
  const response = await fetch('/api/attempts/latest', {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error('The latest Attempt could not be read.');
  }

  return completedAttemptFromResponse(response);
}

/**
 * A failure the Trainee can act on, carrying wording meant for the screen.
 * Anything else that escapes is a fault we cannot ask them to fix.
 */
export class AttemptFailedError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AttemptFailedError';
  }
}

const microphoneDeniedMessage =
  'Conversation Practice needs your microphone. Allow microphone access for this page, then start the Attempt again.';
const microphoneMissingMessage =
  'No microphone was found. Connect one, then start the Attempt again.';

async function openMicrophone(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    const deviceMissing =
      error instanceof DOMException &&
      (error.name === 'NotFoundError' || error.name === 'OverconstrainedError');

    throw new AttemptFailedError(
      deviceMissing ? microphoneMissingMessage : microphoneDeniedMessage,
      { cause: error }
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isClientSecretResponse(value: unknown): value is ClientSecretResponse {
  return (
    isRecord(value) &&
    typeof value.value === 'string' &&
    typeof value.expiresAt === 'number'
  );
}

function stoppedAttemptError(): DOMException {
  return new DOMException('The Attempt was stopped.', 'AbortError');
}

function encodeBase64(buffer: ArrayBuffer): string {
  let binary = '';

  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

/**
 * Whether an item is something someone said out loud. An out-of-band
 * transcription's own output item is reported as a completed message too —
 * carrying text, or nothing at all — even though the response was created with
 * `conversation: "none"`. Transcribing those transcribes the transcript, which
 * recurs for as long as the Attempt lasts. Audio content is what separates a
 * spoken turn from the echo of one.
 */
function hasSpokenContent(item: Record<string, unknown>): boolean {
  return (
    Array.isArray(item.content) &&
    item.content.some(
      (part) =>
        isRecord(part) &&
        (part.type === 'input_audio' || part.type === 'output_audio')
    )
  );
}

/**
 * A turn the Trainee spoke, which is the only kind this session transcribes.
 * The Persona's turns already carry `response.output_audio_transcript.done` —
 * the text its own audio was generated from, by the same model, which is a
 * stronger record than transcribing that audio back afterwards. Asking for one
 * anyway returned nothing roughly half the time.
 */
function traineeTurnId(
  serverEvent: Record<string, unknown>
): string | undefined {
  if (
    serverEvent.type !== 'conversation.item.done' ||
    !isRecord(serverEvent.item)
  ) {
    return undefined;
  }

  const { id, role, type } = serverEvent.item;

  return type === 'message' &&
    role === 'user' &&
    typeof id === 'string' &&
    hasSpokenContent(serverEvent.item)
    ? id
    : undefined;
}

function createTurnTranscriptionEvent(itemId: string, eventId: string) {
  return {
    event_id: eventId,
    type: 'response.create',
    response: {
      conversation: 'none',
      output_modalities: ['text'],
      instructions:
        'Transcribe the referenced spoken turn. Return only the words that were spoken.',
      input: [{ type: 'item_reference', id: itemId }],
      metadata: {
        purpose: 'turn_transcription',
        source_item_id: itemId,
      },
      tools: [],
      tool_choice: 'none',
    },
  };
}

type CompletedTurnTranscription = {
  sourceItemId: string;
  succeeded: boolean;
};

function responseContainsText(response: Record<string, unknown>): boolean {
  if (!Array.isArray(response.output)) {
    return false;
  }

  return response.output.some(
    (item) =>
      isRecord(item) &&
      Array.isArray(item.content) &&
      item.content.some(
        (content) =>
          isRecord(content) &&
          content.type === 'output_text' &&
          typeof content.text === 'string' &&
          content.text.trim() !== ''
      )
  );
}

function responseContainsSpokenOutput(
  response: Record<string, unknown>
): boolean {
  return (
    Array.isArray(response.output) &&
    response.output.some((item) => isRecord(item) && hasSpokenContent(item))
  );
}

function completedTurnTranscription(
  serverEvent: Record<string, unknown>
): CompletedTurnTranscription | undefined {
  if (
    serverEvent.type !== 'response.done' ||
    !isRecord(serverEvent.response) ||
    !isRecord(serverEvent.response.metadata)
  ) {
    return undefined;
  }

  const { purpose, source_item_id: sourceItemId } =
    serverEvent.response.metadata;

  if (purpose !== 'turn_transcription' || typeof sourceItemId !== 'string') {
    return undefined;
  }

  return {
    sourceItemId,
    succeeded:
      serverEvent.response.status === 'completed' &&
      responseContainsText(serverEvent.response),
  };
}

function clientEventIdFromError(
  serverEvent: Record<string, unknown>
): string | undefined {
  if (serverEvent.type !== 'error' || !isRecord(serverEvent.error)) {
    return undefined;
  }

  return typeof serverEvent.error.event_id === 'string'
    ? serverEvent.error.event_id
    : undefined;
}

function waitForDataChannel(
  dataChannel: RTCDataChannel,
  signal: AbortSignal
): Promise<void> {
  if (dataChannel.readyState === 'open') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const removeListeners = () => {
      dataChannel.removeEventListener('open', handleOpen);
      dataChannel.removeEventListener('close', handleClose);
      dataChannel.removeEventListener('error', handleError);
      signal.removeEventListener('abort', handleAbort);
    };
    const handleOpen = () => {
      removeListeners();
      resolve();
    };
    const handleClose = () => {
      removeListeners();
      reject(new Error('The Realtime data channel closed before opening.'));
    };
    const handleError = () => {
      removeListeners();
      reject(new Error('The Realtime data channel could not be opened.'));
    };
    const handleAbort = () => {
      removeListeners();
      reject(stoppedAttemptError());
    };

    dataChannel.addEventListener('open', handleOpen, { once: true });
    dataChannel.addEventListener('close', handleClose, { once: true });
    dataChannel.addEventListener('error', handleError, { once: true });
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

export const connectRealtimeAttempt: ConnectRealtimeAttempt = async ({
  signal,
  onActivity,
  onAttemptEnding,
  onEnded,
  onAttemptDataFailed,
  onAttemptJudgingFailed,
  onJudgingStarted,
  onAttemptCompleted,
}) => {
  let dataChannel: RTCDataChannel | undefined;
  let localMedia: MediaStream | undefined;
  let peerConnection: RTCPeerConnection | undefined;
  let remoteAudio: HTMLAudioElement | undefined;
  const rawEventLog: RawRealtimeEvent[] = [];
  const activeDefaultResponses = new Set<string>();
  const pendingStopCommands = new Map<string, 'cancel' | 'clear' | 'commit'>();
  const transcriptionRequestItems = new Map<string, string>();
  const turnTranscriptions = new Map<
    string,
    'failed' | 'pending' | 'succeeded'
  >();
  const unfinalizedTurnItems = new Set<string>();
  let attemptOpened = false;
  let eventSequence = 0;
  let failureReported = false;
  let finalized = false;
  let hardCap: ReturnType<typeof setTimeout> | undefined;
  let forcedFinalization: ReturnType<typeof setTimeout> | undefined;
  let pendingPersonaHangUpResponseId: string | null | undefined;
  let personaAudioResponseId: string | null | undefined;
  let quietFinalization: ReturnType<typeof setTimeout> | undefined;
  let rawEventLogSubmission: Promise<void> | undefined;
  let stopped = false;

  const nextEventId = (purpose: string) =>
    `conversation_practice_${purpose}_${++eventSequence}`;
  // Whichever outcome lands first is the one the Trainee is told about, and it is
  // the only one: a second report would replace an honest screen with a different
  // honest screen twenty seconds later.
  const reportOnce = (report: () => void) => () => {
    if (failureReported) {
      return;
    }

    failureReported = true;
    report();
  };
  const reportAttemptDataFailure = reportOnce(onAttemptDataFailed);
  const reportAttemptJudgingFailure = reportOnce(onAttemptJudgingFailed);
  const submitRawEventLog = (): Promise<void> => {
    if (!attemptOpened) {
      return Promise.resolve();
    }

    if (!rawEventLogSubmission) {
      onJudgingStarted();
      rawEventLogSubmission = (async () => {
        let previousAttemptNumber: number | undefined;

        try {
          previousAttemptNumber =
            (await readLatestCompletedAttempt())?.number ?? 0;
        } catch {
          // A baseline is only needed for unambiguous timeout recovery. It
          // must not prevent the normal completion request.
        }

        const recoverNewerAttempt = async (
          originalError: unknown
        ): Promise<CompletedAttempt> => {
          const baselineAttemptNumber = previousAttemptNumber;

          if (baselineAttemptNumber === undefined) {
            throw originalError;
          }

          const deadline = Date.now() + attemptRecoveryTimeoutMs;

          for (;;) {
            try {
              const latestAttempt = await readLatestCompletedAttempt();

              if (
                latestAttempt &&
                latestAttempt.number > baselineAttemptNumber
              ) {
                return latestAttempt;
              }
            } catch {
              // A transient read failure is indistinguishable from the server
              // still finishing. Keep the bounded recovery window intact.
            }

            if (Date.now() >= deadline) {
              throw originalError;
            }

            await wait(attemptRecoveryIntervalMs);
          }
        };
        const reportAttemptOutcome = (attempt: CompletedAttempt) => {
          if (attempt.feedback.status === 'completed') {
            onAttemptCompleted(attempt);
          } else {
            reportAttemptJudgingFailure();
          }
        };
        let response: Response;

        try {
          response = await fetch('/api/attempts/raw-event-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rawEventLog),
          });
        } catch (error) {
          reportAttemptOutcome(await recoverNewerAttempt(error));
          return;
        }

        if (!response.ok) {
          const failureCode = await completionFailureCode(response);

          if (failureCode === 'attempt_data_incomplete') {
            reportAttemptDataFailure();
            return;
          }

          if (
            failureCode === 'attempt_judging_failed' ||
            failureCode === 'attempt_processing_failed'
          ) {
            reportAttemptJudgingFailure();
            return;
          }

          reportAttemptOutcome(
            await recoverNewerAttempt(
              new Error('The raw event log could not be stored.')
            )
          );
          return;
        }

        let attempt: CompletedAttempt;

        try {
          attempt = await completedAttemptFromResponse(response);
        } catch (error) {
          attempt = await recoverNewerAttempt(error);
        }

        reportAttemptOutcome(attempt);
      })();
    }

    return rawEventLogSubmission;
  };
  const sendClientEvent = (event: unknown) => {
    const rawEvent = JSON.stringify(event);

    if (!dataChannel) {
      throw new Error('The Realtime data channel is unavailable.');
    }

    dataChannel.send(rawEvent);
    rawEventLog.push({ direction: 'client', event: rawEvent });
  };
  const releaseInputAndOutput = () => {
    localMedia?.getTracks().forEach((track) => track.stop());

    if (remoteAudio) {
      remoteAudio.pause();
      remoteAudio.srcObject = null;
    }
  };
  const clearHardCap = () => {
    if (hardCap) {
      clearTimeout(hardCap);
      hardCap = undefined;
    }
  };
  // The page no longer judges its own log. Turn tracking still decides *when* to
  // finalize, but whether the log is usable is the server's answer — it is the
  // side that reassembles the Transcript, and it says so in the failure code.
  const finalizeAttempt = () => {
    if (finalized) {
      return;
    }

    finalized = true;
    clearHardCap();

    if (forcedFinalization) {
      clearTimeout(forcedFinalization);
      forcedFinalization = undefined;
    }

    if (quietFinalization) {
      clearTimeout(quietFinalization);
      quietFinalization = undefined;
    }

    if (dataChannel && dataChannel.readyState !== 'closed') {
      dataChannel.close();
    }
    peerConnection?.close();

    void submitRawEventLog().catch(reportAttemptDataFailure);
  };
  const hasPendingTurnTranscription = () =>
    [...turnTranscriptions.values()].some((state) => state === 'pending');
  const canFinalizeStoppedAttempt = () =>
    pendingStopCommands.size === 0 &&
    unfinalizedTurnItems.size === 0 &&
    activeDefaultResponses.size === 0 &&
    !hasPendingTurnTranscription();
  const maybeFinalizeStoppedAttempt = () => {
    if (!stopped || finalized || !canFinalizeStoppedAttempt()) {
      return;
    }

    quietFinalization ??= setTimeout(() => {
      quietFinalization = undefined;

      if (canFinalizeStoppedAttempt()) {
        finalizeAttempt();
      }
    }, 150);
  };
  const sendStopCommand = (
    kind: 'cancel' | 'commit',
    event: Record<string, unknown>
  ) => {
    const eventId = nextEventId(`stop_${kind}`);
    pendingStopCommands.set(eventId, kind);

    try {
      sendClientEvent({ event_id: eventId, ...event });
    } catch {
      // The line is already gone, so nothing will ever settle this command.
      // Stop waiting on it and let the log go to the server as it stands.
      pendingStopCommands.delete(eventId);
    }
  };
  const settleStopCommand = (kind: 'cancel' | 'commit') => {
    const pendingCommand = [...pendingStopCommands].find(
      ([, pendingKind]) => pendingKind === kind
    );

    if (pendingCommand) {
      pendingStopCommands.delete(pendingCommand[0]);
    }
  };
  const stop = () => {
    if (stopped) {
      return;
    }

    stopped = true;
    signal.removeEventListener('abort', stop);
    clearHardCap();
    pendingPersonaHangUpResponseId = undefined;
    releaseInputAndOutput();

    if (!attemptOpened) {
      finalizeAttempt();
      return;
    }

    onAttemptEnding();
    forcedFinalization = setTimeout(finalizeAttempt, 15_000);
    sendStopCommand('commit', { type: 'input_audio_buffer.commit' });
    sendStopCommand('cancel', { type: 'response.cancel' });
    // Silencing playback is sent and forgotten. Nothing in the log depends on
    // it, and the session answers a clear with `output_audio_buffer.cleared`
    // only when audio was actually playing — a stop taken in silence gets no
    // reply and no error, so waiting on one waits until the deadline.
    try {
      sendClientEvent({
        event_id: nextEventId('stop_clear'),
        type: 'output_audio_buffer.clear',
      });
    } catch {
      // The line is already gone; playback was released above regardless.
    }

    maybeFinalizeStoppedAttempt();
  };
  const ensureAttemptContinues = () => {
    if (stopped || signal.aborted) {
      releaseInputAndOutput();
      if (!attemptOpened) {
        finalizeAttempt();
      }
      throw stoppedAttemptError();
    }
  };
  const handleUnexpectedEnd = () => {
    if (stopped) {
      return;
    }

    stopped = true;
    signal.removeEventListener('abort', stop);
    releaseInputAndOutput();
    finalizeAttempt();
    onEnded();
  };

  signal.addEventListener('abort', stop, { once: true });

  try {
    ensureAttemptContinues();
    // The microphone comes first. Its permission prompt can sit open for as
    // long as the Trainee hesitates, and the credential minted below is
    // short-lived — minting before this would let it expire in the dialog.
    const microphoneMedia = await openMicrophone();
    localMedia = microphoneMedia;

    ensureAttemptContinues();
    const credentialResponse = await fetch('/api/realtime/client-secret', {
      method: 'POST',
      signal,
    });

    if (!credentialResponse.ok) {
      throw new AttemptFailedError('The live line could not be prepared.');
    }

    const credentialBody: unknown = await credentialResponse.json();

    if (!isClientSecretResponse(credentialBody)) {
      throw new AttemptFailedError(
        'The live line returned an invalid credential.'
      );
    }

    ensureAttemptContinues();
    peerConnection = new RTCPeerConnection();
    peerConnection.addEventListener('connectionstatechange', () => {
      if (
        peerConnection?.connectionState === 'failed' ||
        peerConnection?.connectionState === 'closed'
      ) {
        handleUnexpectedEnd();
      }
    });
    remoteAudio = new Audio();
    remoteAudio.autoplay = true;
    peerConnection.addEventListener('track', (event) => {
      const [remoteStream] = event.streams;

      if (remoteStream && remoteAudio) {
        remoteAudio.srcObject = remoteStream;
      }
    });

    ensureAttemptContinues();
    microphoneMedia
      .getAudioTracks()
      .forEach((track) => peerConnection?.addTrack(track, microphoneMedia));

    dataChannel = peerConnection.createDataChannel('oai-events');
    dataChannel.binaryType = 'arraybuffer';
    dataChannel.addEventListener('message', (message) => {
      if (quietFinalization) {
        clearTimeout(quietFinalization);
        quietFinalization = undefined;
      }

      if (message.data instanceof ArrayBuffer) {
        rawEventLog.push({
          direction: 'server',
          binary: encodeBase64(message.data),
        });
        maybeFinalizeStoppedAttempt();
        return;
      }

      if (typeof message.data !== 'string') {
        maybeFinalizeStoppedAttempt();
        return;
      }

      rawEventLog.push({ direction: 'server', event: message.data });

      let serverEvent: unknown;

      try {
        serverEvent = JSON.parse(message.data);
      } catch {
        maybeFinalizeStoppedAttempt();
        return;
      }

      if (!isRecord(serverEvent) || typeof serverEvent.type !== 'string') {
        maybeFinalizeStoppedAttempt();
        return;
      }

      if (
        serverEvent.type === 'response.function_call_arguments.done' &&
        serverEvent.name === personaHangUpToolName
      ) {
        const responseId =
          typeof serverEvent.response_id === 'string'
            ? serverEvent.response_id
            : undefined;

        if (
          (personaAudioResponseId !== undefined &&
            (responseId === undefined ||
              personaAudioResponseId === null ||
              personaAudioResponseId === responseId)) ||
          (responseId !== undefined && activeDefaultResponses.has(responseId))
        ) {
          pendingPersonaHangUpResponseId =
            responseId ?? personaAudioResponseId ?? null;
        } else {
          stop();
        }
      }

      if (
        serverEvent.type === 'input_audio_buffer.committed' &&
        typeof serverEvent.item_id === 'string'
      ) {
        unfinalizedTurnItems.add(serverEvent.item_id);
        settleStopCommand('commit');
      }

      if (
        serverEvent.type === 'response.created' &&
        isRecord(serverEvent.response) &&
        typeof serverEvent.response.id === 'string' &&
        typeof serverEvent.response.conversation_id === 'string'
      ) {
        activeDefaultResponses.add(serverEvent.response.id);
      }

      const completedTraineeTurnId = traineeTurnId(serverEvent);

      if (completedTraineeTurnId) {
        unfinalizedTurnItems.delete(completedTraineeTurnId);

        if (!turnTranscriptions.has(completedTraineeTurnId)) {
          const eventId = nextEventId('turn_transcription');
          turnTranscriptions.set(completedTraineeTurnId, 'pending');
          transcriptionRequestItems.set(eventId, completedTraineeTurnId);

          try {
            sendClientEvent(
              createTurnTranscriptionEvent(completedTraineeTurnId, eventId)
            );
          } catch {
            turnTranscriptions.set(completedTraineeTurnId, 'failed');
            transcriptionRequestItems.delete(eventId);
          }
        }
      }

      if (
        serverEvent.type === 'response.done' &&
        isRecord(serverEvent.response) &&
        typeof serverEvent.response.id === 'string'
      ) {
        activeDefaultResponses.delete(serverEvent.response.id);

        if (
          pendingPersonaHangUpResponseId === serverEvent.response.id &&
          !responseContainsSpokenOutput(serverEvent.response)
        ) {
          stop();
        }
      }

      const transcription = completedTurnTranscription(serverEvent);

      if (transcription) {
        turnTranscriptions.set(
          transcription.sourceItemId,
          transcription.succeeded ? 'succeeded' : 'failed'
        );

        for (const [eventId, sourceItemId] of transcriptionRequestItems) {
          if (sourceItemId === transcription.sourceItemId) {
            transcriptionRequestItems.delete(eventId);
          }
        }
      } else if (serverEvent.type === 'response.done') {
        // The session only ever runs two kinds of response, and the out-of-band
        // one identifies itself by its metadata above. Anything else finishing
        // is the spoken response the stop asked to cancel — settle it here
        // rather than reading `conversation_id`, so a stop cannot sit waiting
        // on a field this session never promised to send.
        settleStopCommand('cancel');
      }

      const failedClientEventId = clientEventIdFromError(serverEvent);

      if (failedClientEventId) {
        const failedTurnItemId =
          transcriptionRequestItems.get(failedClientEventId);

        if (failedTurnItemId) {
          transcriptionRequestItems.delete(failedClientEventId);
          turnTranscriptions.set(failedTurnItemId, 'failed');
        }

        pendingStopCommands.delete(failedClientEventId);
      }

      if (!stopped && serverEvent.type === 'output_audio_buffer.started') {
        personaAudioResponseId =
          typeof serverEvent.response_id === 'string'
            ? serverEvent.response_id
            : null;
        onActivity('speaking');
      }

      if (
        !stopped &&
        (serverEvent.type === 'output_audio_buffer.stopped' ||
          serverEvent.type === 'output_audio_buffer.cleared')
      ) {
        const responseId =
          typeof serverEvent.response_id === 'string'
            ? serverEvent.response_id
            : undefined;
        // Realtime supplies response IDs on these events. Treat a missing ID
        // as the current response only as a compatibility fallback for older
        // event shapes; known, mismatched IDs must never finish a Hang-up.
        const matchesResponse = (
          expectedResponseId: string | null | undefined
        ) =>
          expectedResponseId !== undefined &&
          (expectedResponseId === null ||
            responseId === undefined ||
            expectedResponseId === responseId);
        const shouldHangUp = matchesResponse(pendingPersonaHangUpResponseId);

        if (matchesResponse(personaAudioResponseId)) {
          personaAudioResponseId = undefined;
          onActivity('listening');
        }

        if (shouldHangUp) {
          stop();
        }
      }

      maybeFinalizeStoppedAttempt();
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ensureAttemptContinues();

    const sdpResponse = await fetch(
      'https://api.openai.com/v1/realtime/calls',
      {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${credentialBody.value}`,
          'Content-Type': 'application/sdp',
        },
        signal,
      }
    );

    if (!sdpResponse.ok) {
      throw new AttemptFailedError('The live line could not be opened.');
    }

    await peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: await sdpResponse.text(),
    });
    ensureAttemptContinues();
    await waitForDataChannel(dataChannel, signal);
    ensureAttemptContinues();
    attemptOpened = true;
    dataChannel.addEventListener('close', handleUnexpectedEnd, { once: true });
    hardCap = setTimeout(stop, attemptHardCapMs);

    sendClientEvent({
      type: 'response.create',
      response: {
        output_modalities: ['audio'],
      },
    });

    return { stop };
  } catch (error) {
    stop();
    throw error;
  }
};
