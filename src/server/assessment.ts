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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
    'For every verdict, quote one complete non-empty line from one Transcript turn that best supports the judgment, including when the criterion was not met.',
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

      const evidence = verdict.evidence.trim();
      const evidenceTurn = transcript[verdict.evidenceTurnIndex];
      const evidenceLines = evidenceTurn?.text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (
        !evidence ||
        !evidenceTurn ||
        (evidenceTurn.speaker === 'persona' && evidenceTurn.cutOff) ||
        !evidenceLines?.includes(evidence)
      ) {
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
