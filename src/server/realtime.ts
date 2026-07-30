import type { Scenario } from '../scenario.js';
import { personaHangUpToolName } from '../realtime-protocol.js';

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

function asBulletList(lines: readonly string[]): string {
  return lines.map((line) => `- ${line}`).join('\n');
}

// Orders the Scenario's authored prose into one prompt. Every sentence the
// model reads comes from the Scenario file; nothing here is a tuning lever.
function buildPersonaInstructions(currentScenario: Scenario): string {
  const { persona } = currentScenario;

  return [
    persona.characterBrief,
    '',
    `Open the call by saying exactly: "${persona.openingLine}"`,
    '',
    'Private profile:',
    asBulletList([
      persona.privateProfile.actualIntent,
      persona.privateProfile.priorIncident,
      persona.privateProfile.meaningOfCancellation,
    ]),
    '',
    'Behaviour rules:',
    asBulletList(persona.behaviourRules),
    '',
    'Delivery rules:',
    asBulletList(persona.deliveryRules),
    '',
    `Gate — ${persona.gate.name}:`,
    persona.gate.condition,
    '',
    'Hang-up precondition:',
    persona.hangUpPrecondition.condition,
    persona.hangUpPrecondition.rationale,
    '',
    'Standing instructions:',
    asBulletList(persona.standingInstructions),
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
          tools: [
            {
              type: 'function',
              name: personaHangUpToolName,
              description: currentScenario.persona.hangUpToolDescription,
              parameters: {
                type: 'object',
                properties: {},
                additionalProperties: false,
              },
            },
          ],
          truncation: 'disabled',
          audio: {
            input: {
              turn_detection: {
                type: 'semantic_vad',
                create_response: true,
                interrupt_response: true,
              },
            },
            output: {
              voice: currentScenario.persona.voice,
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
