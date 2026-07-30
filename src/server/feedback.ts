import type {
  CreateFeedback,
  Assessment,
  Transcript,
} from './attempt-completion.js';
import {
  requestCompletedText,
  type OpenAiResponsesFetch,
} from './openai-responses.js';

export type { OpenAiResponsesFetch } from './openai-responses.js';

type OpenAiFeedbackCreatorOptions = {
  apiKey: string;
  fetch?: OpenAiResponsesFetch;
};

function feedbackInstructions(): string {
  return [
    'Write directly to the Trainee about the completed Attempt.',
    'The Assessment verdicts are fixed. Do not re-judge or re-open them.',
    'Explain what the Trainee should do differently, not merely what they got wrong.',
    'Ground the coaching in specific moments from the supplied Transcript.',
    'Use second person and return only the coaching prose.',
    'Use only the supplied Assessment and Transcript.',
  ].join('\n');
}

export function createOpenAiFeedbackCreator({
  apiKey,
  fetch: fetchFromOpenAi = globalThis.fetch,
}: OpenAiFeedbackCreatorOptions): CreateFeedback {
  return async (assessment: Assessment, transcript: Transcript) => {
    const feedback = await requestCompletedText({
      apiKey,
      fetch: fetchFromOpenAi,
      request: {
        model: 'gpt-5.6-sol',
        store: false,
        safety_identifier: 'conversation-practice-local-trainee',
        instructions: feedbackInstructions(),
        input: JSON.stringify({ assessment, transcript }),
      },
      errors: {
        requestFailed: (status) =>
          `OpenAI could not create Feedback (${status}).`,
        malformedJson: 'OpenAI returned malformed Feedback response JSON.',
        incomplete: 'OpenAI returned an incomplete Feedback response.',
        missingText: 'OpenAI returned no Feedback.',
      },
    });

    if (!feedback.trim()) {
      throw new TypeError('OpenAI returned empty Feedback.');
    }

    return feedback;
  };
}
