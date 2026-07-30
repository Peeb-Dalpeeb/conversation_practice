export type TranscriptSpeaker = 'persona' | 'trainee';

export type TranscriptTurn =
  | {
      speaker: TranscriptSpeaker;
      text: string;
      cutOff: false;
    }
  | {
      speaker: 'persona';
      text: string;
      cutOff: true;
      audioEndMs: number;
    };

export type Transcript = TranscriptTurn[];

export type PendingTranscriptTurn = {
  speaker: TranscriptSpeaker;
  status: 'awaiting-text';
  itemId: string;
};

export type TranscriptSnapshotTurn = TranscriptTurn | PendingTranscriptTurn;

export type TranscriptSnapshot = TranscriptSnapshotTurn[];
