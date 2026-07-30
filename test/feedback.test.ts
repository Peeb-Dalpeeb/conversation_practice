import { describe, expect, it, vi } from 'vitest';

import {
  createOpenAiFeedbackCreator,
  type OpenAiResponsesFetch,
} from '../src/server/feedback.js';
import type {
  Assessment,
  Transcript,
} from '../src/server/attempt-completion.js';

const assessment: Assessment = {
  criteria: [
    {
      criterionId: 'asked-open-question',
      met: true,
      evidence: 'Can you tell me what happened?',
    },
    {
      criterionId: 'surfaced-real-reason',
      met: false,
      evidence: 'Fees are too high.',
    },
  ],
};

const transcript: Transcript = [
  {
    speaker: 'trainee',
    text: 'Can you tell me what happened?',
    cutOff: false,
  },
  {
    speaker: 'persona',
    text: 'Fees are too high.',
    cutOff: false,
  },
];

function completedResponse(feedback: string) {
  return new Response(
    JSON.stringify({
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: feedback }],
        },
      ],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

describe('Feedback creation', () => {
  it('coaches from the fixed Assessment and Transcript only', async () => {
    const openAiFetch = vi
      .fn<OpenAiResponsesFetch>()
      .mockResolvedValue(
        completedResponse(
          'You opened well with “Can you tell me what happened?” Next time, follow the price concern with a question about the experience behind it.'
        )
      );
    const createFeedback = createOpenAiFeedbackCreator({
      apiKey: 'server-api-key',
      fetch: openAiFetch,
    });

    await expect(createFeedback(assessment, transcript)).resolves.toBe(
      'You opened well with “Can you tell me what happened?” Next time, follow the price concern with a question about the experience behind it.'
    );

    expect(openAiFetch).toHaveBeenCalledOnce();
    const [input, init] = openAiFetch.mock.calls[0] as [string, RequestInit];
    expect(input).toBe('https://api.openai.com/v1/responses');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer server-api-key',
      'Content-Type': 'application/json',
    });
    expect(typeof init.body).toBe('string');

    if (typeof init.body !== 'string') {
      throw new Error('Expected the OpenAI request body to be JSON text.');
    }

    const body = JSON.parse(init.body) as {
      model: string;
      store: boolean;
      instructions: string;
      input: string;
    };
    expect(body.model).toBe('gpt-5.6-sol');
    expect(body.store).toBe(false);
    expect(JSON.parse(body.input)).toEqual({ assessment, transcript });
    expect(body.input).not.toContain('privateProfile');
    expect(body.instructions).toMatch(/verdicts? (?:are|is) fixed/i);
    expect(body.instructions).toMatch(/do not re-(?:judge|open)/i);
    expect(body.instructions).toMatch(/specific moments?/i);
    expect(body.instructions).toMatch(/write directly to the Trainee/i);
  });
});
