import type { PrivateProfile, RubricCriterion, Scenario } from '../scenario.js';
import type { Attempt, StoreAttempt } from './attempt-store.js';
import type { StoreRawEventLog } from './raw-event-log.js';

export type TranscriptTurn =
  | {
      speaker: 'persona' | 'trainee';
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

export type Assessment = {
  criteria: {
    criterionId: string;
    met: boolean;
    evidence: string;
  }[];
};

export type AssessAttempt = (
  transcript: Transcript,
  rubric: readonly RubricCriterion[],
  privateProfile: PrivateProfile
) => Promise<Assessment>;

export type CreateFeedback = (
  assessment: Assessment,
  transcript: Transcript
) => Promise<string>;

export type CompleteAttempt = (rawEventLog: string) => Promise<Attempt>;

/**
 * Why an Attempt did not come back judged. `data` means the event log could not
 * be reassembled and re-running the judging would fail the same way; `judging`
 * means the log was fine and the models were not. The Trainee is told a
 * different thing in each case, so the kind travels with the failure.
 */
export class AttemptCompletionError extends Error {
  readonly kind: 'data' | 'judging';

  constructor(
    kind: 'data' | 'judging',
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'AttemptCompletionError';
    this.kind = kind;
  }
}

type RealtimeEvent = Record<string, unknown>;

type SpokenTurn = {
  id: string;
  previousItemId: string | null;
  speaker: 'persona' | 'trainee';
};

type AttemptCompleterOptions = {
  scenario: Scenario;
  assessAttempt: AssessAttempt;
  createFeedback: CreateFeedback;
  storeAttempt: StoreAttempt;
  storeRawEventLog?: StoreRawEventLog;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseRealtimeEvents(rawEventLog: string): RealtimeEvent[] {
  const envelopes: unknown = JSON.parse(rawEventLog);

  if (!Array.isArray(envelopes)) {
    throw new TypeError('The raw event log must be an array.');
  }

  return envelopes.flatMap((envelope) => {
    if (!isRecord(envelope) || typeof envelope.event !== 'string') {
      return [];
    }

    const event: unknown = JSON.parse(envelope.event);
    return isRecord(event) ? [event] : [];
  });
}

function itemFromEvent(event: RealtimeEvent) {
  return isRecord(event.item) ? event.item : undefined;
}

function hasSpokenContent(item: Record<string, unknown>): boolean {
  return (
    Array.isArray(item.content) &&
    item.content.some(
      (content) =>
        isRecord(content) &&
        (content.type === 'input_audio' || content.type === 'output_audio')
    )
  );
}

function spokenTurnFromEvent(event: RealtimeEvent): SpokenTurn | undefined {
  if (
    event.type !== 'conversation.item.added' &&
    event.type !== 'conversation.item.done'
  ) {
    return undefined;
  }

  const item = itemFromEvent(event);

  if (
    !item ||
    typeof item.id !== 'string' ||
    (item.role !== 'assistant' && item.role !== 'user') ||
    (event.type === 'conversation.item.done' && !hasSpokenContent(item))
  ) {
    return undefined;
  }

  const previousItemId = event.previous_item_id;

  if (previousItemId !== null && typeof previousItemId !== 'string') {
    return undefined;
  }

  return {
    id: item.id,
    previousItemId,
    speaker: item.role === 'user' ? 'trainee' : 'persona',
  };
}

function outputText(response: Record<string, unknown>): string | undefined {
  if (!Array.isArray(response.output)) {
    return undefined;
  }

  for (const output of response.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) {
      continue;
    }

    for (const content of output.content) {
      if (
        isRecord(content) &&
        content.type === 'output_text' &&
        typeof content.text === 'string'
      ) {
        return content.text;
      }
    }
  }

  return undefined;
}

function orderSpokenTurns(turnsById: Map<string, SpokenTurn>): SpokenTurn[] {
  const nextTurnByPreviousId = new Map<string | null, SpokenTurn>();

  for (const turn of turnsById.values()) {
    if (nextTurnByPreviousId.has(turn.previousItemId)) {
      throw new TypeError('The raw event log has an ambiguous turn chain.');
    }

    nextTurnByPreviousId.set(turn.previousItemId, turn);
  }

  const orderedTurns: SpokenTurn[] = [];
  let nextTurn = nextTurnByPreviousId.get(null);

  while (nextTurn) {
    orderedTurns.push(nextTurn);
    nextTurn = nextTurnByPreviousId.get(nextTurn.id);
  }

  if (orderedTurns.length !== turnsById.size) {
    throw new TypeError('The raw event log has an incomplete turn chain.');
  }

  return orderedTurns;
}

function reconstructTranscript(rawEventLog: string): Transcript {
  const events = parseRealtimeEvents(rawEventLog);
  const turnsById = new Map<string, SpokenTurn>();
  const personaTextByItemId = new Map<string, string>();
  const traineeTextByItemId = new Map<string, string>();
  const truncationByItemId = new Map<string, number>();

  for (const event of events) {
    const spokenTurn = spokenTurnFromEvent(event);

    if (spokenTurn) {
      turnsById.set(spokenTurn.id, spokenTurn);
    }

    if (
      event.type === 'response.output_audio_transcript.done' &&
      typeof event.item_id === 'string' &&
      typeof event.transcript === 'string'
    ) {
      personaTextByItemId.set(event.item_id, event.transcript);
    }

    if (event.type === 'response.done' && isRecord(event.response)) {
      const metadata = isRecord(event.response.metadata)
        ? event.response.metadata
        : undefined;
      const text = outputText(event.response);

      if (
        metadata?.purpose === 'turn_transcription' &&
        typeof metadata.source_item_id === 'string' &&
        text !== undefined
      ) {
        traineeTextByItemId.set(metadata.source_item_id, text);
      }
    }

    if (
      event.type === 'conversation.item.truncated' &&
      typeof event.item_id === 'string' &&
      typeof event.audio_end_ms === 'number'
    ) {
      truncationByItemId.set(event.item_id, event.audio_end_ms);
    }
  }

  // Fail closed rather than guessing through a chain or text gap: every later
  // Assessment quote inherits this ordering and speaker attribution.
  return orderSpokenTurns(turnsById).map((turn): TranscriptTurn => {
    const text =
      turn.speaker === 'persona'
        ? personaTextByItemId.get(turn.id)
        : traineeTextByItemId.get(turn.id);

    if (text === undefined) {
      throw new TypeError(`The raw event log has no text for turn ${turn.id}.`);
    }

    const audioEndMs = truncationByItemId.get(turn.id);

    if (turn.speaker === 'persona' && audioEndMs !== undefined) {
      return {
        speaker: 'persona',
        text,
        cutOff: true,
        audioEndMs,
      };
    }

    return {
      speaker: turn.speaker,
      text,
      cutOff: false,
    };
  });
}

function diagnosticErrorMessage(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

export function createAttemptCompleter({
  scenario,
  assessAttempt,
  createFeedback,
  storeAttempt,
  storeRawEventLog,
}: AttemptCompleterOptions): CompleteAttempt {
  return async (rawEventLog) => {
    // Raw archival is forensic support, not a prerequisite for the judged
    // Attempt. Start it immediately so even a reconstruction failure is kept
    // when possible, but do not let its failure replace the product outcome.
    const rawEventLogStorage = storeRawEventLog
      ? Promise.resolve()
          .then(() => storeRawEventLog(rawEventLog))
          .catch((error: unknown) => {
            console.error('Raw event log could not be stored.', error);
          })
      : Promise.resolve();

    try {
      let transcript: Transcript;

      try {
        transcript = reconstructTranscript(rawEventLog);
      } catch (error) {
        throw new AttemptCompletionError(
          'data',
          'The Attempt event data could not be reconstructed.',
          { cause: error }
        );
      }

      let assessment: Assessment;

      try {
        assessment = await assessAttempt(
          transcript,
          scenario.rubric,
          scenario.persona.privateProfile
        );
      } catch (error) {
        throw new AttemptCompletionError(
          'judging',
          'The Assessment could not be created.',
          { cause: error }
        );
      }

      let feedback: string;

      try {
        feedback = await createFeedback(assessment, transcript);
      } catch (error) {
        let attempt: Attempt;

        try {
          attempt = await storeAttempt({
            scenarioId: scenario.id,
            transcript,
            assessment,
            feedback: {
              status: 'failed',
              error: diagnosticErrorMessage(error),
            },
          });
        } catch (storageError) {
          throw new AttemptCompletionError(
            'judging',
            'Feedback failed and the partial Attempt could not be stored.',
            { cause: storageError }
          );
        }

        // Name the file that survived. This is the message a tuning run reads
        // off the server terminal, and the Transcript and Assessment it points
        // at are the only record of what the run actually produced.
        throw new AttemptCompletionError(
          'judging',
          `The Feedback could not be created; the Attempt was stored as number ${String(attempt.number)} without it.`,
          { cause: error }
        );
      }

      try {
        return await storeAttempt({
          scenarioId: scenario.id,
          transcript,
          assessment,
          feedback: { status: 'completed', prose: feedback },
        });
      } catch (error) {
        throw new AttemptCompletionError(
          'judging',
          'The judged Attempt could not be stored.',
          { cause: error }
        );
      }
    } finally {
      await rawEventLogStorage;
    }
  };
}
