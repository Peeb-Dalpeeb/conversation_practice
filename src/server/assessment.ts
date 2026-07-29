import type { RubricCriterion } from '../scenario.js';
import type {
  AssessAttempt,
  Assessment,
  Transcript,
} from './attempt-completion.js';

const responsesUrl = 'https://api.openai.com/v1/responses';

export type OpenAiResponsesFetch = typeof globalThis.fetch;

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

function normalizeQuoteCharacter(character: string): string {
  if (character === '\u2018' || character === '\u2019') {
    return "'";
  }

  if (character === '\u201c' || character === '\u201d') {
    return '"';
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
    const normalizedCharacter = normalizeQuoteCharacter(character);
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
    'For every verdict, provide a concise exact contiguous quote from one Transcript turn that best supports the judgment, including when the criterion was not met.',
    'Set evidenceTurnIndex to the zero-based index of that Transcript turn.',
    'Never use a Persona turn marked cutOff as evidence because the Trainee did not necessarily hear its complete text.',
    'Judge only from the supplied Transcript and Rubric.',
  ].join('\n');
}

function outputText(response: Record<string, unknown>): string | undefined {
  if (!Array.isArray(response.output)) {
    return undefined;
  }

  for (const output of response.output) {
    if (
      !isRecord(output) ||
      output.type !== 'message' ||
      !Array.isArray(output.content)
    ) {
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
        throw new TypeError(
          'OpenAI returned evidence that is not an eligible Transcript quote.'
        );
      }

      const evidence = sourceQuote(evidenceTurn.text, verdict.evidence);

      if (evidence === undefined) {
        throw new TypeError(
          'OpenAI returned evidence that is not an eligible Transcript quote.'
        );
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
  return async (transcript, rubric) => {
    const response = await fetchFromOpenAi(responsesUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.6-sol',
        store: false,
        safety_identifier: 'conversation-practice-local-trainee',
        instructions: assessmentInstructions(),
        input: JSON.stringify({ transcript, rubric }),
        text: {
          format: {
            type: 'json_schema',
            name: 'attempt_assessment',
            strict: true,
            schema: assessmentSchema(rubric),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI could not assess the Attempt (${response.status}).`
      );
    }

    const body: unknown = await response.json();

    if (!isRecord(body) || body.status !== 'completed') {
      throw new TypeError('OpenAI returned an incomplete Assessment response.');
    }

    const text = outputText(body);

    if (text === undefined) {
      throw new TypeError('OpenAI returned no structured Assessment.');
    }

    let assessment: unknown;

    try {
      assessment = JSON.parse(text);
    } catch {
      throw new TypeError('OpenAI returned malformed Assessment JSON.');
    }

    return validateAssessment(assessment, transcript, rubric);
  };
}
