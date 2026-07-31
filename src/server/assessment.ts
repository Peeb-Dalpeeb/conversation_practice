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

type AssessmentVerdict = Assessment['criteria'][number] & {
  evidenceTurnIndex: number;
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

// A rejected quote discards the whole Attempt, so the throw has to say which
// criterion and which quote. Tuning runs read this from the server log; without
// it the only signal is a bare 500 long after the Attempt is over.
function ineligibleQuoteMessage(verdict: AssessmentVerdict): string {
  const quote =
    verdict.evidence.length > 120
      ? `${verdict.evidence.slice(0, 120)}…`
      : verdict.evidence;

  return `OpenAI returned evidence that is not an eligible Transcript quote for "${verdict.criterionId}" at turn ${String(verdict.evidenceTurnIndex)}: ${JSON.stringify(quote)}`;
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
            evidence: { type: 'string' },
            evidenceTurnIndex: {
              type: 'integer',
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
    'For every verdict, provide a concise exact contiguous quote from one Transcript turn that best supports the judgment. For a criterion that was not met, quote the Trainee action that failed it or the closest concrete opportunity the Trainee missed; never use an unrelated line merely because the schema requires evidence.',
    'Set evidenceTurnIndex to the zero-based index of that Transcript turn.',
    "Quote the turn the verdict is actually about and follow that criterion's assessmentGuidance for whose turn to quote. A criterion about the Trainee's behaviour normally quotes a Trainee turn; a revealed fact normally quotes the Persona turn that revealed it.",
    'Give each criterion its own best evidence. When two moments support a verdict equally well, use the earliest one so identical input has a stable tie-break. Do not reuse a quote when a distinct Transcript moment directly supports one of the verdicts, and never substitute weaker or irrelevant evidence merely to make the quotes different.',
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
      typeof criterion.evidence !== 'string' ||
      !Number.isInteger(criterion.evidenceTurnIndex)
    ) {
      throw new TypeError('OpenAI returned an invalid Assessment criterion.');
    }

    return {
      criterionId: criterion.criterionId,
      met: criterion.met,
      evidence: criterion.evidence,
      evidenceTurnIndex: criterion.evidenceTurnIndex as number,
    };
  });
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

      const evidenceTurn = transcript[verdict.evidenceTurnIndex];

      if (
        !evidenceTurn ||
        (evidenceTurn.speaker === 'persona' && evidenceTurn.cutOff)
      ) {
        throw new TypeError(ineligibleQuoteMessage(verdict));
      }

      const evidence = sourceQuote(evidenceTurn.text, verdict.evidence);

      if (evidence === undefined) {
        throw new TypeError(ineligibleQuoteMessage(verdict));
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
