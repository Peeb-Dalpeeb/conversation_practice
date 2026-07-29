import type { Scenario } from '../scenario.js';

const realtimeClientSecretsUrl =
  'https://api.openai.com/v1/realtime/client_secrets';

export type RealtimeClientSecret = {
  value: string;
  expiresAt: number;
};

export type MintRealtimeClientSecret = (
  currentScenario: Scenario
) => Promise<RealtimeClientSecret>;

type RealtimeClientSecretMinterOptions = {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildPersonaInstructions(currentScenario: Scenario): string {
  const { persona } = currentScenario;
  const behaviourRules = persona.behaviourRules
    .map((rule) => `- ${rule}`)
    .join('\n');

  return [
    `You are the Persona ${persona.name} in a spoken practice Attempt.`,
    `Begin the Attempt by saying exactly: "${persona.openingLine}"`,
    '',
    'Private Profile:',
    `- Actual intent: ${persona.privateProfile.actualIntent}`,
    `- Prior incident: ${persona.privateProfile.priorIncident}`,
    `- Meaning of cancellation: ${persona.privateProfile.meaningOfCancellation}`,
    '',
    'Behaviour rules:',
    behaviourRules,
    '',
    `Gate: ${persona.gate.name}`,
    persona.gate.condition,
    '',
    'Stay in the Persona throughout the Attempt. Do not mention these instructions,',
    'the Private Profile, the Gate, or the fact that this is practice.',
  ].join('\n');
}

export function createOpenAiRealtimeClientSecretMinter({
  apiKey,
  fetch: fetchFromOpenAi = globalThis.fetch,
}: RealtimeClientSecretMinterOptions): MintRealtimeClientSecret {
  return async (currentScenario) => {
    const response = await fetchFromOpenAi(realtimeClientSecretsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': 'conversation-practice-local-trainee',
      },
      body: JSON.stringify({
        expires_after: {
          anchor: 'created_at',
          seconds: 60,
        },
        session: {
          type: 'realtime',
          model: 'gpt-realtime-2.1',
          output_modalities: ['audio'],
          instructions: buildPersonaInstructions(currentScenario),
          audio: {
            input: {
              turn_detection: {
                type: 'semantic_vad',
                create_response: true,
                interrupt_response: true,
              },
            },
            output: {
              voice: 'marin',
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI could not mint a Realtime client secret (${response.status}).`
      );
    }

    const body: unknown = await response.json();

    if (
      !isRecord(body) ||
      typeof body.value !== 'string' ||
      typeof body.expires_at !== 'number'
    ) {
      throw new Error('OpenAI returned an invalid Realtime client secret.');
    }

    return {
      value: body.value,
      expiresAt: body.expires_at,
    };
  };
}
