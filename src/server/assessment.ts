import type { RubricCriterion } from '../scenario.js';
import type { Transcript } from '../transcript.js';
import type { AssessAttempt, Assessment } from './attempt-completion.js';
import {
  requestCompletedText,
  type OpenAiResponsesFetch,
} from './openai-responses.js';

export type { OpenAiResponsesFetch } from './openai-responses.js';

type OpenAiAttemptAssessorOptions = {
  apiKey: string;
  fetch?: OpenAiResponsesFetch;
};

type AssessmentVerdict = {
  criterionId: string;
  met: boolean;
  // Both null when the grader declines to quote. The wire schema is strict, so
  // the fields are always present and a decline arrives as a null rather than
  // as a missing key.
  evidence: string | null;
  evidenceTurnIndex: number | null;
};

type SourceSpan = {
  start: number;
  end: number;
};

function isSameSourceSpan(
  left: SourceSpan | undefined,
  right: SourceSpan | undefined
): boolean {
  return (
    left !== undefined &&
    right !== undefined &&
    left.start === right.start &&
    left.end === right.end
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Only typographic variants of the same character, never different words. The
// Transcript is written by one model and quoted back by another, and they
// disagree about curly quotes and dashes far more often than about wording.
function normalizeTypography(character: string): string {
  if (character === '\u2018' || character === '\u2019') {
    return "'";
  }

  if (character === '\u201c' || character === '\u201d') {
    return '"';
  }

  if (character === '\u2013' || character === '\u2014') {
    return '-';
  }

  if (character === '\u2026') {
    return '...';
  }

  return character;
}

function normalizeWithSourceMap(value: string): {
  normalized: string;
  sourceSpans: SourceSpan[];
} {
  let normalized = '';
  const sourceSpans: SourceSpan[] = [];
  let pendingWhitespace: SourceSpan | undefined;

  for (let index = 0; index < value.length;) {
    const codePoint = value.codePointAt(index);

    if (codePoint === undefined) {
      break;
    }

    const character = String.fromCodePoint(codePoint);
    const end = index + character.length;

    if (/\s/u.test(character)) {
      pendingWhitespace = {
        start: pendingWhitespace?.start ?? index,
        end,
      };
      index = end;
      continue;
    }

    if (pendingWhitespace && normalized) {
      normalized += ' ';
      sourceSpans.push(pendingWhitespace);
    }

    pendingWhitespace = undefined;
    const normalizedCharacter = normalizeTypography(character);
    normalized += normalizedCharacter;

    for (
      let normalizedIndex = 0;
      normalizedIndex < normalizedCharacter.length;
      normalizedIndex += 1
    ) {
      sourceSpans.push({ start: index, end });
    }

    index = end;
  }

  return { normalized, sourceSpans };
}

function sourceQuote(
  transcriptText: string,
  proposedEvidence: string
): string | undefined {
  const normalizedEvidence =
    normalizeWithSourceMap(proposedEvidence).normalized;

  if (!normalizedEvidence) {
    return undefined;
  }

  const normalizedTranscript = normalizeWithSourceMap(transcriptText);
  const matchStart =
    normalizedTranscript.normalized.indexOf(normalizedEvidence);

  if (matchStart === -1) {
    return undefined;
  }

  const matchEnd = matchStart + normalizedEvidence.length;
  const firstSpan = normalizedTranscript.sourceSpans[matchStart];
  const lastSpan = normalizedTranscript.sourceSpans[matchEnd - 1];

  if (
    !firstSpan ||
    !lastSpan ||
    isSameSourceSpan(
      normalizedTranscript.sourceSpans[matchStart - 1],
      firstSpan
    ) ||
    isSameSourceSpan(normalizedTranscript.sourceSpans[matchEnd], lastSpan)
  ) {
    return undefined;
  }

  return transcriptText.slice(firstSpan.start, lastSpan.end);
}

function shortQuote(quote: string): string {
  return JSON.stringify(quote.length > 120 ? `${quote.slice(0, 120)}…` : quote);
}

// A rejected quote discards the whole Attempt, so the throw has to say which
// criterion and which quote. Tuning runs read this from the server log; without
// it the only signal is a bare 500 long after the Attempt is over.
function ineligibleQuoteMessage(
  verdict: AssessmentVerdict,
  quote: string
): string {
  return `OpenAI returned evidence that is not an eligible Transcript quote for "${verdict.criterionId}" at turn ${String(verdict.evidenceTurnIndex)}: ${shortQuote(quote)}`;
}

function assessmentSchema(rubric: readonly RubricCriterion[]) {
  return {
    type: 'object',
    properties: {
      criteria: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            criterionId: {
              type: 'string',
              enum: rubric.map(({ id }) => id),
            },
            met: { type: 'boolean' },
            // Nullable so a not-met verdict can decline to quote. The schema
            // cannot express "nullable only when met is false" under strict
            // structured outputs, so the validator is what keeps an unquoted
            // met verdict impossible.
            evidence: { type: ['string', 'null'] },
            evidenceTurnIndex: {
              type: ['integer', 'null'],
              minimum: 0,
            },
          },
          required: ['criterionId', 'met', 'evidence', 'evidenceTurnIndex'],
          additionalProperties: false,
        },
        minItems: rubric.length,
        maxItems: rubric.length,
      },
    },
    required: ['criteria'],
    additionalProperties: false,
  };
}

function assessmentInstructions(): string {
  return [
    'Judge the completed Attempt against its Rubric.',
    'Return one verdict for every criterion, using each supplied criterionId exactly once.',
    'The met value is strictly binary: true or false.',
    'Each Rubric criterion has a description and assessmentGuidance. The description is the layperson-visible standard; apply assessmentGuidance only to make that same standard and its evidence selection explicit, never to impose a different criterion.',
    'Evidence must prove the verdict it sits under on its own, read without the other five. Provide a concise exact contiguous quote from one Transcript turn and set evidenceTurnIndex to the zero-based index of that turn.',
    "A met verdict always has to be quoted: quote the turn that demonstrates the criterion, following that criterion's assessmentGuidance for whose turn that is. A revealed fact quotes the Persona turn that revealed it.",
    'A not-met verdict has to be proved by a Trainee turn, because every criterion judges the Trainee and a Persona turn cannot show what the Trainee failed to do. Quote the Trainee turn that itself failed the criterion.',
    'When the Attempt contains no such Trainee turn — usually because the conversation never reached the point where the behaviour was possible — set both evidence and evidenceTurnIndex to null. That records no qualifying Trainee moment, and it is the required answer: never borrow a line that does not itself prove the verdict, and never fill the field with a line that proves some other criterion instead of this one. Only a not-met verdict may decline to quote.',
    'Give each criterion its own best evidence. When two moments support a verdict equally well, use the earliest one so identical input has a stable tie-break. Do not reuse a quote when a distinct Transcript moment directly supports one of the verdicts, and never substitute weaker or irrelevant evidence merely to make the quotes different.',
    // Ticket 13's third rehearsal measurement: criteria 1 and 3 both name the
    // earliest Trainee turn that stopped discovery, which in the demo's
    // four-offer shape is one and the same opening offer. Read as a flat ban on
    // repetition, the rule above walked criterion 3 — the row opened live on the
    // projector — down to the third offer to keep the quotes distinct. Distinctness
    // is a tie-break, never a reason to quote a turn the criterion did not name.
    "When a criterion's assessmentGuidance names which turn to quote, quote that turn even if another criterion names the same one. Two criteria may rest on the same moment when each names it independently; moving to a later or weaker turn only to avoid repeating a quote is always wrong.",
    'Never use a Persona turn marked cutOff as evidence because the Trainee did not necessarily hear its complete text.',
    'The Private Profile is ground truth the Trainee could not see and it is not part of the Attempt. Use it only to decide what the Transcript shows.',
    'Judge only from the supplied Transcript, Rubric, and Private Profile.',
  ].join('\n');
}

function parseVerdicts(value: unknown): AssessmentVerdict[] {
  if (!isRecord(value) || !Array.isArray(value.criteria)) {
    throw new TypeError('OpenAI returned an invalid Assessment.');
  }

  return value.criteria.map((criterion): AssessmentVerdict => {
    if (
      !isRecord(criterion) ||
      typeof criterion.criterionId !== 'string' ||
      typeof criterion.met !== 'boolean' ||
      (criterion.evidence !== null && typeof criterion.evidence !== 'string') ||
      (criterion.evidenceTurnIndex !== null &&
        !Number.isInteger(criterion.evidenceTurnIndex))
    ) {
      throw new TypeError('OpenAI returned an invalid Assessment criterion.');
    }

    return {
      criterionId: criterion.criterionId,
      met: criterion.met,
      evidence: criterion.evidence,
      evidenceTurnIndex: criterion.evidenceTurnIndex as number | null,
    };
  });
}

// A quote is declined when the grader says there was nothing to quote. An empty
// string is the same statement written a different way, and reading it as a
// zero-length quote would only turn it into a rejection further down.
function declinesToQuote(verdict: AssessmentVerdict): boolean {
  return verdict.evidence === null || verdict.evidence.trim() === '';
}

function validateAssessment(
  value: unknown,
  transcript: Transcript,
  rubric: readonly RubricCriterion[]
): Assessment {
  const verdicts = parseVerdicts(value);

  if (verdicts.length !== rubric.length) {
    throw new TypeError('OpenAI returned the wrong number of Rubric verdicts.');
  }

  const verdictByCriterionId = new Map<string, AssessmentVerdict>();

  for (const verdict of verdicts) {
    if (verdictByCriterionId.has(verdict.criterionId)) {
      throw new TypeError('OpenAI returned a duplicate Rubric verdict.');
    }

    verdictByCriterionId.set(verdict.criterionId, verdict);
  }

  return {
    criteria: rubric.map(({ id }) => {
      const verdict = verdictByCriterionId.get(id);

      if (!verdict) {
        throw new TypeError('OpenAI omitted a Rubric verdict.');
      }

      if (declinesToQuote(verdict)) {
        if (verdict.met) {
          throw new TypeError(
            `OpenAI returned a met verdict for "${id}" without a Transcript quote.`
          );
        }

        return { criterionId: id, met: false };
      }

      const proposedEvidence = verdict.evidence ?? '';
      const evidenceTurn =
        verdict.evidenceTurnIndex === null
          ? undefined
          : transcript[verdict.evidenceTurnIndex];

      if (
        !evidenceTurn ||
        (evidenceTurn.speaker === 'persona' && evidenceTurn.cutOff)
      ) {
        throw new TypeError(ineligibleQuoteMessage(verdict, proposedEvidence));
      }

      const evidence = sourceQuote(evidenceTurn.text, proposedEvidence);

      if (evidence === undefined) {
        throw new TypeError(ineligibleQuoteMessage(verdict, proposedEvidence));
      }

      // Every criterion judges the Trainee, so a Persona turn cannot show what
      // the Trainee failed to do — it is the borrowed line ticket 15 removes,
      // and ticket 13's rehearsals read one off the projector under criterion
      // 3. Record the absence rather than discarding the Attempt: a failed
      // Assessment in front of a room is worse than a row that says the
      // Trainee never got there.
      if (!verdict.met && evidenceTurn.speaker === 'persona') {
        console.warn(
          `Discarding a Persona quote offered as proof of the not-met verdict for "${id}": ${shortQuote(evidence)}`
        );

        return { criterionId: id, met: false };
      }

      return {
        criterionId: id,
        met: verdict.met,
        evidence,
      };
    }),
  };
}

export function createOpenAiAttemptAssessor({
  apiKey,
  fetch: fetchFromOpenAi = globalThis.fetch,
}: OpenAiAttemptAssessorOptions): AssessAttempt {
  return async (transcript, rubric, privateProfile) => {
    const text = await requestCompletedText({
      apiKey,
      fetch: fetchFromOpenAi,
      request: {
        model: 'gpt-5.6-sol',
        store: false,
        safety_identifier: 'conversation-practice-local-trainee',
        instructions: assessmentInstructions(),
        input: JSON.stringify({ transcript, rubric, privateProfile }),
        text: {
          format: {
            type: 'json_schema',
            name: 'attempt_assessment',
            strict: true,
            schema: assessmentSchema(rubric),
          },
        },
      },
      errors: {
        requestFailed: (status) =>
          `OpenAI could not assess the Attempt (${status}).`,
        malformedJson: 'OpenAI returned malformed Assessment response JSON.',
        incomplete: 'OpenAI returned an incomplete Assessment response.',
        missingText: 'OpenAI returned no structured Assessment.',
      },
    });

    let assessment: unknown;

    try {
      assessment = JSON.parse(text);
    } catch {
      throw new TypeError('OpenAI returned malformed Assessment JSON.');
    }

    return validateAssessment(assessment, transcript, rubric);
  };
}
