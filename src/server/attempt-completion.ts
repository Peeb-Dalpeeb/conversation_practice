import { randomUUID } from 'node:crypto';

import type { PrivateProfile, RubricCriterion, Scenario } from '../scenario.js';
import type {
  Transcript,
  TranscriptSnapshot,
  TranscriptSnapshotTurn,
} from '../transcript.js';
import type { Attempt, StoreAttempt } from './attempt-store.js';
import type { StoreRawEventLog } from './raw-event-log.js';

/**
 * Every verdict about a met criterion carries the Transcript quote that proves
 * it. A not-met verdict may instead carry nothing: an Attempt that never
 * reached the moment a criterion asks about contains no Trainee turn that
 * proves the failure, and borrowing an unrelated line to fill the field is the
 * failure ticket 15 removes. Absence is never available to a met verdict —
 * that is the flattering grader `docs/adr/0001` exists to prevent.
 */
export type Assessment = {
  criteria: {
    criterionId: string;
    met: boolean;
    evidence?: string;
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
  speaker: 'persona' | 'trainee';
};

type ConversationItemLink = {
  id: string;
  previousItemId: string | null;
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

function conversationItemLinkFromEvent(
  event: RealtimeEvent
): ConversationItemLink | undefined {
  if (event.type !== 'conversation.item.added') {
    return undefined;
  }

  const item = itemFromEvent(event);
  const previousItemId = event.previous_item_id;

  if (
    !item ||
    typeof item.id !== 'string' ||
    (previousItemId !== null && typeof previousItemId !== 'string')
  ) {
    return undefined;
  }

  return { id: item.id, previousItemId };
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

  return {
    id: item.id,
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

/**
 * The turn a spoken turn follows: the nearest ancestor that is itself spoken.
 * The default Conversation chain also carries role-less items — a Persona
 * Hang-up is a `function_call` item in that same chain — and no captured log yet
 * shows whether the API places one before, after, or beside the turn it
 * accompanies. Stepping over them leaves the Transcript's order the same
 * whichever it turns out to be.
 */
function previousSpokenTurnId(
  turnId: string,
  turnsById: Map<string, SpokenTurn>,
  conversationItemsById: Map<string, ConversationItemLink>
): string | null {
  let ancestorId = conversationItemsById.get(turnId)?.previousItemId ?? null;
  let remainingItems = conversationItemsById.size;

  while (ancestorId !== null && !turnsById.has(ancestorId)) {
    if (remainingItems === 0) {
      throw new TypeError('The raw event log has a circular turn chain.');
    }

    remainingItems -= 1;
    ancestorId = conversationItemsById.get(ancestorId)?.previousItemId ?? null;
  }

  return ancestorId;
}

function orderSpokenTurns(
  turnsById: Map<string, SpokenTurn>,
  conversationItemsById: Map<string, ConversationItemLink>
): SpokenTurn[] {
  // Only spoken turns are ordered here. Out-of-band transcription outputs never
  // emit `conversation.item.added`, which keeps their separate null-headed
  // chains out of the links this reads.
  const nextTurnByPreviousId = new Map<string | null, SpokenTurn>();

  for (const turn of turnsById.values()) {
    const previousTurnId = previousSpokenTurnId(
      turn.id,
      turnsById,
      conversationItemsById
    );

    if (nextTurnByPreviousId.has(previousTurnId)) {
      throw new TypeError('The raw event log has an ambiguous turn chain.');
    }

    nextTurnByPreviousId.set(previousTurnId, turn);
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

export function reconstructTranscriptSnapshot(
  rawEventLog: string
): TranscriptSnapshot {
  const events = parseRealtimeEvents(rawEventLog);
  const turnsById = new Map<string, SpokenTurn>();
  const conversationItemsById = new Map<string, ConversationItemLink>();
  const personaTextByItemId = new Map<string, string>();
  const traineeTextByItemId = new Map<string, string>();
  const truncationByItemId = new Map<string, number>();

  for (const event of events) {
    const conversationItem = conversationItemLinkFromEvent(event);
    const spokenTurn = spokenTurnFromEvent(event);

    if (conversationItem) {
      conversationItemsById.set(conversationItem.id, conversationItem);
    }

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

  return orderSpokenTurns(turnsById, conversationItemsById).map(
    (turn): TranscriptSnapshotTurn => {
      const text =
        turn.speaker === 'persona'
          ? personaTextByItemId.get(turn.id)
          : traineeTextByItemId.get(turn.id);

      if (text === undefined) {
        return {
          speaker: turn.speaker,
          status: 'awaiting-text',
          itemId: turn.id,
        };
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
    }
  );
}

export function reconstructTranscript(rawEventLog: string): Transcript {
  // Completion fails closed rather than guessing through a text gap: every
  // later Assessment quote inherits this ordering and speaker attribution.
  return reconstructTranscriptSnapshot(rawEventLog).map((turn) => {
    if ('status' in turn) {
      throw new TypeError(
        `The raw event log has no text for turn ${turn.itemId}.`
      );
    }

    return turn;
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
    const rawEventLogId = storeRawEventLog ? randomUUID() : undefined;
    const rawEventLogStorage =
      storeRawEventLog && rawEventLogId
        ? Promise.resolve()
            .then(() => storeRawEventLog(rawEventLog, rawEventLogId))
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
            ...(rawEventLogId ? { rawEventLogId } : {}),
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
          ...(rawEventLogId ? { rawEventLogId } : {}),
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
