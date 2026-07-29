import { describe, expect, it, vi } from 'vitest';

import { scenario } from '../src/scenario.js';
import {
  createOpenAiAttemptAssessor,
  type OpenAiResponsesFetch,
} from '../src/server/assessment.js';
import type { Transcript } from '../src/server/attempt-completion.js';

const transcript: Transcript = [
  {
    speaker: 'persona',
    text: "I'd like to close my account.",
    cutOff: false,
  },
  {
    speaker: 'trainee',
    text: 'Can you tell me what happened?',
    cutOff: false,
  },
];

function completedAssessmentResponse(criteria: unknown): Response {
  return new Response(
    JSON.stringify({
      status: 'completed',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({ criteria }),
            },
          ],
        },
      ],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

describe('the OpenAI Assessment boundary', () => {
  it('judges the fixed Rubric in a fresh structured gpt-5.6-sol response', async () => {
    const criteria = scenario.rubric.map((criterion, index) => ({
      criterionId: criterion.id,
      met: index === 1,
      evidence:
        index === 1
          ? 'Can you tell me what happened?'
          : "I'd like to close my account.",
      evidenceTurnIndex: index === 1 ? 1 : 0,
    }));
    const openAiFetch = vi
      .fn<OpenAiResponsesFetch>()
      .mockResolvedValue(completedAssessmentResponse(criteria));
    const assessAttempt = createOpenAiAttemptAssessor({
      apiKey: 'server-api-key',
      fetch: openAiFetch,
    });

    await expect(assessAttempt(transcript, scenario.rubric)).resolves.toEqual({
      criteria: criteria.map(
        ({
          criterionId,
          met,
          evidence,
        }): {
          criterionId: string;
          met: boolean;
          evidence: string;
        } => ({ criterionId, met, evidence })
      ),
    });

    expect(openAiFetch).toHaveBeenCalledOnce();
    const [input, init] = openAiFetch.mock.calls[0];
    expect(input).toBe('https://api.openai.com/v1/responses');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer server-api-key',
      'Content-Type': 'application/json',
    });
    expect(typeof init?.body).toBe('string');

    if (typeof init?.body !== 'string') {
      throw new Error('Expected the OpenAI request body to be JSON text.');
    }

    const body = JSON.parse(init.body) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'gpt-5.6-sol',
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'attempt_assessment',
          strict: true,
        },
      },
    });
    expect(body).not.toHaveProperty('previous_response_id');
    expect(body).not.toHaveProperty('conversation');
    expect(JSON.stringify(body)).toContain(
      'Did not try to solve anything before understanding why.'
    );
    expect(JSON.stringify(body)).toContain('Can you tell me what happened?');
  });

  it('returns every verdict in the fixed Rubric order', async () => {
    const reversedCriteria = [...scenario.rubric]
      .reverse()
      .map((criterion) => ({
        criterionId: criterion.id,
        met: false,
        evidence: 'Can you tell me what happened?',
        evidenceTurnIndex: 1,
      }));
    const openAiFetch = vi
      .fn<OpenAiResponsesFetch>()
      .mockResolvedValue(completedAssessmentResponse(reversedCriteria));
    const assessAttempt = createOpenAiAttemptAssessor({
      apiKey: 'server-api-key',
      fetch: openAiFetch,
    });

    const assessment = await assessAttempt(transcript, scenario.rubric);

    expect(assessment.criteria.map(({ criterionId }) => criterionId)).toEqual(
      scenario.rubric.map(({ id }) => id)
    );
  });

  it('rejects a quote from a cut-off Persona turn', async () => {
    const cutOffTranscript: Transcript = [
      {
        speaker: 'persona',
        text: 'The generated ending was never heard.',
        cutOff: true,
        audioEndMs: 1_000,
      },
      {
        speaker: 'trainee',
        text: 'What happened?',
        cutOff: false,
      },
    ];
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: 'The generated ending was never heard.',
      evidenceTurnIndex: 0,
    }));
    const openAiFetch = vi
      .fn<OpenAiResponsesFetch>()
      .mockResolvedValue(completedAssessmentResponse(criteria));
    const assessAttempt = createOpenAiAttemptAssessor({
      apiKey: 'server-api-key',
      fetch: openAiFetch,
    });

    await expect(
      assessAttempt(cutOffTranscript, scenario.rubric)
    ).rejects.toThrow(/eligible Transcript quote/);
  });

  it('rejects evidence that is only a fragment of a Transcript line', async () => {
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: 'tell me what happened',
      evidenceTurnIndex: 1,
    }));
    const openAiFetch = vi
      .fn<OpenAiResponsesFetch>()
      .mockResolvedValue(completedAssessmentResponse(criteria));
    const assessAttempt = createOpenAiAttemptAssessor({
      apiKey: 'server-api-key',
      fetch: openAiFetch,
    });

    await expect(assessAttempt(transcript, scenario.rubric)).rejects.toThrow(
      /eligible Transcript quote/
    );
  });
});
