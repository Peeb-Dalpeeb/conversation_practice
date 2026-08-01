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
    // Every criterion judges the Trainee, so the not-met verdicts quote the
    // Trainee turn; only a met verdict may rest on a Persona turn.
    const criteria = scenario.rubric.map((criterion, index) => ({
      criterionId: criterion.id,
      met: index === 1,
      evidence: 'Can you tell me what happened?',
      evidenceTurnIndex: 1,
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
    // The exact wording is pinned once, in the Scenario's own test. Here the
    // claim is only that the Rubric's layperson-visible text reaches the call.
    expect(JSON.stringify(body)).toContain(scenario.rubric[0].description);
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
    const request = JSON.parse(body) as {
      instructions: string;
      input: string;
    };
    expect(request).toMatchObject({
      instructions: expect.stringContaining('assessmentGuidance') as string,
    });
    expect(request.instructions).not.toMatch(
      /understood-before-solving|avoided-defensiveness|checked-customer-felt-heard|surfaced-real-reason/
    );
    expect(JSON.parse(request.input)).toMatchObject({
      rubric: scenario.rubric,
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
      met: true,
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
        met: true,
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
      met: true,
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
      met: true,
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

// Ticket 13's two live rehearsals read a grid where the Previous attempt's
// evidence did not prove its own criterion. The Transcript below is the one
// both rehearsals produced — four offers, then Jordan volunteering the cover
// story — and the verdicts below are the ones the room saw on the projector.
describe('evidence that proves its own criterion', () => {
  const rehearsalTranscript: Transcript = [
    {
      speaker: 'persona',
      text: "I'd like to close my account.",
      cutOff: false,
    },
    {
      speaker: 'trainee',
      text: 'I can offer you a discount on your next six months.',
      cutOff: false,
    },
    {
      speaker: 'persona',
      text: "I'm not interested; that offer changes nothing, and I want the account closed.",
      cutOff: false,
    },
    {
      speaker: 'trainee',
      text: 'What if I waived your fees entirely?',
      cutOff: false,
    },
    {
      speaker: 'persona',
      text: 'That question has already been answered, and I still want the account closed.',
      cutOff: false,
    },
    {
      speaker: 'trainee',
      text: "There's a cheaper plan I could move you to today.",
      cutOff: false,
    },
    {
      speaker: 'persona',
      text: "I'm tired of repeating this, and I still want the account closed.",
      cutOff: false,
    },
    {
      speaker: 'trainee',
      text: 'So can I keep you on with that?',
      cutOff: false,
    },
    {
      speaker: 'persona',
      text: 'The fees are too high, and somewhere else is cheaper.',
      cutOff: false,
    },
  ];

  type GraderVerdict = {
    criterionId: string;
    met: boolean;
    evidence: string | null;
    evidenceTurnIndex: number | null;
  };

  // The grader's own output, before validation. Each entry names the turn index
  // the rehearsal's Assessment cited for that criterion.
  function graderVerdicts(
    citedTurns: readonly (number | null)[]
  ): GraderVerdict[] {
    return scenario.rubric.map((criterion, index) => {
      const turnIndex = citedTurns[index] ?? null;
      const turn =
        turnIndex === null ? undefined : rehearsalTranscript[turnIndex];

      return {
        criterionId: criterion.id,
        met: false,
        evidence: turn?.text ?? null,
        evidenceTurnIndex: turnIndex,
      };
    });
  }

  function assessRehearsal(criteria: readonly GraderVerdict[]) {
    return assessorReturning(completedAssessmentResponse(criteria))(
      rehearsalTranscript,
      scenario.rubric,
      privateProfile
    );
  }

  function verdictFor(
    assessment: { criteria: { criterionId: string }[] },
    criterionId: string
  ) {
    return assessment.criteria.find(
      (verdict) => verdict.criterionId === criterionId
    );
  }

  // Rehearsal 1 and rehearsal 2 both showed Jordan's cover story under
  // criterion 3. A Persona turn cannot show what the Trainee failed to do, so
  // it is never that verdict's proof.
  it('never proves a not-met verdict with a Persona turn', async () => {
    const assessment = await assessRehearsal(
      graderVerdicts([1, 3, 8, 5, 7, 7])
    );

    expect(verdictFor(assessment, 'surfaced-real-reason')).toEqual({
      criterionId: 'surfaced-real-reason',
      met: false,
    });
    expect(verdictFor(assessment, 'surfaced-real-reason')).not.toHaveProperty(
      'evidence'
    );
  });

  it("keeps the Trainee turn that foreclosed discovery as criterion 3's proof", async () => {
    const assessment = await assessRehearsal(
      graderVerdicts([1, 3, 1, 5, 7, 7])
    );

    expect(verdictFor(assessment, 'surfaced-real-reason')).toEqual({
      criterionId: 'surfaced-real-reason',
      met: false,
      evidence: 'I can offer you a discount on your next six months.',
    });
  });

  // Criterion 3 is the one opened live on the projector, and attempt two's row
  // is Jordan stating the prior incident. A met verdict is still free to quote
  // the Persona turn that proves it.
  it('keeps a Persona quote under a met verdict', async () => {
    const criteria = graderVerdicts([1, 3, 8, 5, 7, 7]).map((verdict) =>
      verdict.criterionId === 'surfaced-real-reason'
        ? { ...verdict, met: true }
        : verdict
    );
    const assessment = await assessRehearsal(criteria);

    expect(verdictFor(assessment, 'surfaced-real-reason')).toEqual({
      criterionId: 'surfaced-real-reason',
      met: true,
      evidence: 'The fees are too high, and somewhere else is cheaper.',
    });
  });

  // Rehearsal 1 showed "So, can I keep you on with that?" under criteria 5 and
  // 6, neither of which the Trainee ever demonstrated. The Attempt contains no
  // qualifying moment for either, and the contract has to let the grader say so.
  it('accepts a not-met verdict that records the absence of a qualifying moment', async () => {
    const assessment = await assessRehearsal(
      graderVerdicts([1, 3, 1, 5, null, null])
    );

    expect(assessment.criteria).toEqual([
      {
        criterionId: 'understood-before-solving',
        met: false,
        evidence: 'I can offer you a discount on your next six months.',
      },
      {
        criterionId: 'asked-open-question',
        met: false,
        evidence: 'What if I waived your fees entirely?',
      },
      {
        criterionId: 'surfaced-real-reason',
        met: false,
        evidence: 'I can offer you a discount on your next six months.',
      },
      {
        criterionId: 'acknowledged-without-excuses',
        met: false,
        evidence: "There's a cheaper plan I could move you to today.",
      },
      { criterionId: 'avoided-defensiveness', met: false },
      { criterionId: 'checked-customer-felt-heard', met: false },
    ]);
  });

  // Absence of evidence is only ever available to a not-met verdict. An
  // unquoted met verdict is the flattering-grader failure docs/adr/0001 exists
  // to prevent.
  it.each([
    { name: 'a null quote', evidence: null, evidenceTurnIndex: null },
    { name: 'an empty quote', evidence: '   ', evidenceTurnIndex: 1 },
  ])(
    'rejects a met verdict with $name',
    async ({ evidence, evidenceTurnIndex }) => {
      const criteria = graderVerdicts([1, 3, 1, 5, 7, 7]).map((verdict) =>
        verdict.criterionId === 'avoided-defensiveness'
          ? { ...verdict, met: true, evidence, evidenceTurnIndex }
          : verdict
      );

      await expect(assessRehearsal(criteria)).rejects.toThrow(
        /met verdict for "avoided-defensiveness" without a Transcript quote/
      );
    }
  );

  it('tells the grader that a not-met verdict may record no qualifying Trainee moment', async () => {
    const openAiFetch = vi
      .fn<OpenAiResponsesFetch>()
      .mockResolvedValue(
        completedAssessmentResponse(graderVerdicts([1, 3, 1, 5, null, null]))
      );

    await createOpenAiAttemptAssessor({
      apiKey: 'server-api-key',
      fetch: openAiFetch,
    })(rehearsalTranscript, scenario.rubric, privateProfile);

    const body = openAiFetch.mock.calls[0][1]?.body;

    if (typeof body !== 'string') {
      throw new Error('Expected the OpenAI request body to be JSON text.');
    }

    const request = JSON.parse(body) as {
      instructions: string;
      text: { format: { schema: Record<string, unknown> } };
    };
    expect(request.instructions).toMatch(/no qualifying Trainee moment/i);
    // A quote is optional on the wire so the grader can decline; the validator
    // is what keeps a met verdict from taking that option.
    expect(JSON.stringify(request.text.format.schema)).toContain(
      '"string","null"'
    );
  });
});
