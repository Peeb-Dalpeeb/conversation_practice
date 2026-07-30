import { describe, expect, it, vi } from 'vitest';

import { scenario } from '../src/scenario.js';
import {
  createOpenAiAttemptAssessor,
  type OpenAiResponsesFetch,
} from '../src/server/assessment.js';
import type { Transcript } from '../src/transcript.js';

const privateProfile = scenario.persona.privateProfile;

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

function assessmentResponseWithText(
  text: string,
  status = 'completed'
): Response {
  return new Response(
    JSON.stringify({
      status,
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text,
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

function completedAssessmentResponse(criteria: unknown): Response {
  return assessmentResponseWithText(JSON.stringify({ criteria }));
}

function assessorReturning(response: Response) {
  return createOpenAiAttemptAssessor({
    apiKey: 'server-api-key',
    fetch: vi.fn<OpenAiResponsesFetch>().mockResolvedValue(response),
  });
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

    await expect(
      assessAttempt(transcript, scenario.rubric, privateProfile)
    ).resolves.toEqual({
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

  // Without the prior incident the grader has no way to tell the cover story
  // from the real reason, and was measured giving criterion 3 away.
  it('sends the Private Profile as ground truth', async () => {
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: "I'd like to close my account.",
      evidenceTurnIndex: 0,
    }));
    const openAiFetch = vi
      .fn<OpenAiResponsesFetch>()
      .mockResolvedValue(completedAssessmentResponse(criteria));
    const assessAttempt = createOpenAiAttemptAssessor({
      apiKey: 'server-api-key',
      fetch: openAiFetch,
    });

    await assessAttempt(transcript, scenario.rubric, privateProfile);

    const body = openAiFetch.mock.calls[0][1]?.body;

    if (typeof body !== 'string') {
      throw new Error('Expected the OpenAI request body to be JSON text.');
    }

    expect(body).toContain(privateProfile.priorIncident);
    expect(JSON.parse(body)).toMatchObject({
      instructions: expect.stringContaining('cover story') as string,
    });
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

    const assessment = await assessAttempt(
      transcript,
      scenario.rubric,
      privateProfile
    );

    expect(assessment.criteria.map(({ criterionId }) => criterionId)).toEqual(
      scenario.rubric.map(({ id }) => id)
    );
  });

  it('rejects a quote from a cut-off Persona turn', async () => {
    const cutOffTranscript: Transcript = [
      {
        speaker: 'persona',
        text: 'The fee wasn’t the point. The generated ending was never heard.',
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
      evidence: "The fee wasn't the point.",
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
      assessAttempt(cutOffTranscript, scenario.rubric, privateProfile)
    ).rejects.toThrow(/eligible Transcript quote/);
  });

  it('accepts an exact sentence quoted from a longer Transcript turn', async () => {
    const multiSentenceTranscript: Transcript = [
      {
        speaker: 'persona',
        text: 'The fee was not the point. I felt stupid for asking.',
        cutOff: false,
      },
    ];
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: 'I felt stupid for asking.',
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
      assessAttempt(multiSentenceTranscript, scenario.rubric, privateProfile)
    ).resolves.toEqual({
      criteria: scenario.rubric.map((criterion) => ({
        criterionId: criterion.id,
        met: false,
        evidence: 'I felt stupid for asking.',
      })),
    });
  });

  it('returns the original Transcript slice after conservative quote normalization', async () => {
    const typographicTranscript: Transcript = [
      {
        speaker: 'persona',
        text: 'The fee wasn’t the point.\nI felt\tstupid for asking.',
        cutOff: false,
      },
    ];
    const criteria = scenario.rubric.map((criterion, index) => ({
      criterionId: criterion.id,
      met: false,
      evidence:
        index % 2 === 0
          ? "The fee wasn't the point."
          : 'I felt stupid for asking.',
      evidenceTurnIndex: 0,
    }));
    const openAiFetch = vi
      .fn<OpenAiResponsesFetch>()
      .mockResolvedValue(completedAssessmentResponse(criteria));
    const assessAttempt = createOpenAiAttemptAssessor({
      apiKey: 'server-api-key',
      fetch: openAiFetch,
    });

    const assessment = await assessAttempt(
      typographicTranscript,
      scenario.rubric,
      privateProfile
    );

    expect(assessment.criteria.map(({ evidence }) => evidence)).toEqual([
      'The fee wasn’t the point.',
      'I felt\tstupid for asking.',
      'The fee wasn’t the point.',
      'I felt\tstupid for asking.',
      'The fee wasn’t the point.',
      'I felt\tstupid for asking.',
    ]);
  });

  it.each([
    {
      name: 'an em dash rewritten as a hyphen',
      transcriptText: 'I called once — and that was enough.',
      evidence: 'I called once - and that was enough.',
    },
    {
      name: 'an ellipsis rewritten as three dots',
      transcriptText: 'I just… gave up after that.',
      evidence: 'I just... gave up after that.',
    },
  ])('accepts $name', async ({ transcriptText, evidence }) => {
    const typographicTranscript: Transcript = [
      { speaker: 'persona', text: transcriptText, cutOff: false },
    ];
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence,
      evidenceTurnIndex: 0,
    }));

    const assessment = await assessorReturning(
      completedAssessmentResponse(criteria)
    )(typographicTranscript, scenario.rubric, privateProfile);

    expect(assessment.criteria.map((verdict) => verdict.evidence)).toEqual(
      scenario.rubric.map(() => transcriptText)
    );
  });

  it('names the criterion and the quote when evidence is rejected', async () => {
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: 'I never said this.',
      evidenceTurnIndex: 1,
    }));

    await expect(
      assessorReturning(completedAssessmentResponse(criteria))(
        transcript,
        scenario.rubric,
        privateProfile
      )
    ).rejects.toThrow(
      /eligible Transcript quote for "understood-before-solving" at turn 1: "I never said this\."/
    );
  });

  it('does not search another turn when the evidence turn index is wrong', async () => {
    const indexedTranscript: Transcript = [
      {
        speaker: 'trainee',
        text: 'Can you tell me what happened?',
        cutOff: false,
      },
      {
        speaker: 'persona',
        text: 'The fees are too high.',
        cutOff: false,
      },
    ];
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: 'Can you tell me what happened?',
      evidenceTurnIndex: 1,
    }));

    await expect(
      assessorReturning(completedAssessmentResponse(criteria))(
        indexedTranscript,
        scenario.rubric,
        privateProfile
      )
    ).rejects.toThrow(/eligible Transcript quote/);
  });

  it('rejects noncontiguous or invented evidence', async () => {
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: 'Can you what happened?',
      evidenceTurnIndex: 1,
    }));

    await expect(
      assessorReturning(completedAssessmentResponse(criteria))(
        transcript,
        scenario.rubric,
        privateProfile
      )
    ).rejects.toThrow(/eligible Transcript quote/);
  });

  it.each([
    {
      name: 'case changes',
      transcriptText: 'Can you tell me what happened?',
      evidence: 'can you tell me what happened?',
    },
    {
      name: 'non-quote punctuation changes',
      transcriptText: 'Can you tell me what happened?',
      evidence: 'Can you tell me what happened.',
    },
    {
      name: 'half of a supplementary character',
      transcriptText: 'That response felt 😀.',
      evidence: '\ud83d',
    },
  ])(
    'rejects $name during conservative quote matching',
    async ({ transcriptText, evidence }) => {
      const conservativeTranscript: Transcript = [
        {
          speaker: 'trainee',
          text: transcriptText,
          cutOff: false,
        },
      ];
      const criteria = scenario.rubric.map((criterion) => ({
        criterionId: criterion.id,
        met: false,
        evidence,
        evidenceTurnIndex: 0,
      }));

      await expect(
        assessorReturning(completedAssessmentResponse(criteria))(
          conservativeTranscript,
          scenario.rubric,
          privateProfile
        )
      ).rejects.toThrow(/eligible Transcript quote/);
    }
  );

  it('surfaces an OpenAI HTTP failure', async () => {
    await expect(
      assessorReturning(new Response('', { status: 503 }))(
        transcript,
        scenario.rubric,
        privateProfile
      )
    ).rejects.toThrow(/could not assess the Attempt \(503\)/);
  });

  it.each([
    {
      name: 'an incomplete response',
      response: assessmentResponseWithText('{}', 'incomplete'),
      expectedError: /incomplete Assessment response/,
    },
    {
      name: 'a response without structured output',
      response: new Response(
        JSON.stringify({ status: 'completed', output: [] }),
        { status: 200 }
      ),
      expectedError: /no structured Assessment/,
    },
    {
      name: 'malformed structured JSON',
      response: assessmentResponseWithText('not JSON'),
      expectedError: /malformed Assessment JSON/,
    },
  ])('rejects $name', async ({ response, expectedError }) => {
    await expect(
      assessorReturning(response)(transcript, scenario.rubric, privateProfile)
    ).rejects.toThrow(expectedError);
  });

  it.each([
    {
      name: 'a non-array criteria value',
      assessment: { criteria: 'not-an-array' },
      expectedError: /invalid Assessment/,
    },
    {
      name: 'a non-binary verdict',
      assessment: {
        criteria: scenario.rubric.map((criterion) => ({
          criterionId: criterion.id,
          met: 'partial',
          evidence: "I'd like to close my account.",
          evidenceTurnIndex: 0,
        })),
      },
      expectedError: /invalid Assessment criterion/,
    },
    {
      name: 'the wrong verdict count',
      assessment: {
        criteria: scenario.rubric.slice(0, -1).map((criterion) => ({
          criterionId: criterion.id,
          met: false,
          evidence: "I'd like to close my account.",
          evidenceTurnIndex: 0,
        })),
      },
      expectedError: /wrong number of Rubric verdicts/,
    },
  ])('rejects $name', async ({ assessment, expectedError }) => {
    await expect(
      assessorReturning(assessmentResponseWithText(JSON.stringify(assessment)))(
        transcript,
        scenario.rubric,
        privateProfile
      )
    ).rejects.toThrow(expectedError);
  });

  it('rejects a duplicate criterion that leaves another criterion omitted', async () => {
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: "I'd like to close my account.",
      evidenceTurnIndex: 0,
    }));
    const finalCriterion = criteria.at(-1);

    if (!finalCriterion) {
      throw new Error('Expected the fixed Rubric to contain criteria.');
    }

    finalCriterion.criterionId = scenario.rubric[0].id;

    await expect(
      assessorReturning(completedAssessmentResponse(criteria))(
        transcript,
        scenario.rubric,
        privateProfile
      )
    ).rejects.toThrow(/duplicate Rubric verdict/);
  });

  it('rejects an unknown criterion that leaves a fixed criterion omitted', async () => {
    const criteria = scenario.rubric.map((criterion) => ({
      criterionId: criterion.id,
      met: false,
      evidence: "I'd like to close my account.",
      evidenceTurnIndex: 0,
    }));
    const finalCriterion = criteria.at(-1);

    if (!finalCriterion) {
      throw new Error('Expected the fixed Rubric to contain criteria.');
    }

    finalCriterion.criterionId = 'unknown-criterion';

    await expect(
      assessorReturning(completedAssessmentResponse(criteria))(
        transcript,
        scenario.rubric,
        privateProfile
      )
    ).rejects.toThrow(/omitted a Rubric verdict/);
  });
});
