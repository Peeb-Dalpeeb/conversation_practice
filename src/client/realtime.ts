export type AttemptActivity = 'listening' | 'speaking';

export type RealtimeAttempt = {
  stop(): void;
};

type ConnectRealtimeAttemptOptions = {
  signal: AbortSignal;
  onActivity: (activity: AttemptActivity) => void;
};

export type ConnectRealtimeAttempt = (
  options: ConnectRealtimeAttemptOptions
) => Promise<RealtimeAttempt>;

type ClientSecretResponse = {
  value: string;
  expiresAt: number;
};

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
}) => {
  let dataChannel: RTCDataChannel | undefined;
  let localMedia: MediaStream | undefined;
  let peerConnection: RTCPeerConnection | undefined;
  let remoteAudio: HTMLAudioElement | undefined;
  let stopped = false;

  const closeResources = () => {
    if (dataChannel && dataChannel.readyState !== 'closed') {
      dataChannel.close();
    }
    localMedia?.getTracks().forEach((track) => track.stop());
    peerConnection?.close();

    if (remoteAudio) {
      remoteAudio.pause();
      remoteAudio.srcObject = null;
    }
  };
  const stop = () => {
    stopped = true;
    signal.removeEventListener('abort', stop);
    closeResources();
  };
  const ensureAttemptContinues = () => {
    if (stopped || signal.aborted) {
      closeResources();
      throw stoppedAttemptError();
    }
  };

  signal.addEventListener('abort', stop, { once: true });

  try {
    ensureAttemptContinues();
    const credentialResponse = await fetch('/api/realtime/client-secret', {
      method: 'POST',
      signal,
    });

    if (!credentialResponse.ok) {
      throw new Error('The live line could not be prepared.');
    }

    const credentialBody: unknown = await credentialResponse.json();

    if (!isClientSecretResponse(credentialBody)) {
      throw new Error('The live line returned an invalid credential.');
    }

    ensureAttemptContinues();
    peerConnection = new RTCPeerConnection();
    remoteAudio = new Audio();
    remoteAudio.autoplay = true;
    peerConnection.addEventListener('track', (event) => {
      const [remoteStream] = event.streams;

      if (remoteStream && remoteAudio) {
        remoteAudio.srcObject = remoteStream;
      }
    });

    const microphoneMedia = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    localMedia = microphoneMedia;
    ensureAttemptContinues();
    microphoneMedia
      .getAudioTracks()
      .forEach((track) => peerConnection?.addTrack(track, microphoneMedia));

    dataChannel = peerConnection.createDataChannel('oai-events');
    dataChannel.addEventListener('message', (message) => {
      if (typeof message.data !== 'string') {
        return;
      }

      let serverEvent: unknown;

      try {
        serverEvent = JSON.parse(message.data);
      } catch {
        return;
      }

      if (!isRecord(serverEvent) || typeof serverEvent.type !== 'string') {
        return;
      }

      if (serverEvent.type === 'response.created') {
        onActivity('speaking');
      }

      if (serverEvent.type === 'response.done') {
        onActivity('listening');
      }
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
      throw new Error('The live line could not be opened.');
    }

    await peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: await sdpResponse.text(),
    });
    ensureAttemptContinues();
    await waitForDataChannel(dataChannel, signal);
    ensureAttemptContinues();

    dataChannel.send(
      JSON.stringify({
        type: 'response.create',
        response: {
          output_modalities: ['audio'],
        },
      })
    );

    return { stop };
  } catch (error) {
    stop();
    throw error;
  }
};
