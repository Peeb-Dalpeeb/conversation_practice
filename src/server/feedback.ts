import type { Transcript } from '../transcript.js';
import type { CreateFeedback, Assessment } from './attempt-completion.js';
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
    'Praise only actions supported by a met Assessment verdict; do not soften a failing Assessment with general praise for warmth, courtesy, rapport, or professionalism.',
    'Explain what the Trainee should do differently, not merely what they got wrong.',
    'Ground the coaching in specific moments from the supplied Transcript.',
    "A Persona's stated reason is not necessarily the real one. When surfacing the real reason was not met, treat the stated reason as unestablished and coach the Trainee to ask what experience or event sits behind the decision, not to examine, summarize, or model an acknowledgment of the stated reason in more detail. Any question you model must omit the stated reason and possible answers entirely: invite the Persona to tell what happened in their own words. Until that experience is surfaced, the next move you model must be curiosity rather than acknowledgment.",
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
