import { readFile, rm, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer as createViteServer, type ViteDevServer } from 'vite';

import { scenario, type Scenario } from '../src/scenario.js';
import type { Attempt } from '../src/server/attempt-store.js';
import { createApiServer } from '../src/server/app.js';
import { createOpenAiRealtimeClientSecretMinter } from '../src/server/realtime.js';

const servers: ReturnType<typeof createApiServer>[] = [];
const viteServers: ViteDevServer[] = [];
const proxyMode = `proxy-test-${process.pid}`;
const proxyEnvironmentPath = resolve(`.env.${proxyMode}`);
const inheritedServerPort = process.env.SERVER_PORT;
const completedAttempt: Attempt = {
  scenarioId: scenario.id,
  number: 1,
  transcript: [],
  assessment: { criteria: [] },
  feedback: {
    status: 'completed',
    prose: 'Keep asking about the experience behind the request.',
  },
};

function completedAttemptWithMarks(
  number: number,
  marks: readonly boolean[]
): Attempt {
  return {
    ...completedAttempt,
    number,
    assessment: {
      criteria: scenario.rubric.map((criterion, index) => ({
        criterionId: criterion.id,
        met: marks[index] ?? false,
        evidence: `Evidence from Attempt ${String(number)} for ${criterion.id}.`,
      })),
    },
  };
}

async function startApiServer(
  currentScenario: Scenario = scenario
): Promise<number> {
  const server = createApiServer({ currentScenario });
  servers.push(server);

  await new Promise<void>((resolveListening) => {
    server.listen(0, '127.0.0.1', resolveListening);
  });

  return (server.address() as AddressInfo).port;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(viteServers.splice(0).map((server) => server.close()));
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
  await rm(proxyEnvironmentPath, { force: true });

  if (inheritedServerPort === undefined) {
    delete process.env.SERVER_PORT;
  } else {
    process.env.SERVER_PORT = inheritedServerPort;
  }
});

describe('the server HTTP interface', () => {
  it('reports that the local API is available', async () => {
    const port = await startApiServer();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('serves the Trainee-safe Scenario details', async () => {
    const apiScenario: Scenario = {
      ...scenario,
      id: 'scenario-supplied-at-startup',
      title: 'Scenario supplied at startup',
      briefing: {
        role: 'Role supplied at startup.',
        counterpart: 'Counterpart supplied at startup.',
        situation: 'Situation supplied at startup.',
        constraint: 'Limits supplied at startup.',
      },
      persona: {
        ...scenario.persona,
        name: 'Public Persona',
        publicDescription: 'Public description supplied at startup.',
        privateProfile: {
          actualIntent: 'Private intent must remain on the server.',
          priorIncident: 'Private incident must remain on the server.',
          meaningOfCancellation: 'Private meaning must remain on the server.',
        },
      },
    };
    const port = await startApiServer(apiScenario);
    const response = await fetch(`http://127.0.0.1:${port}/api/scenario`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 'scenario-supplied-at-startup',
      title: 'Scenario supplied at startup',
      briefing: {
        role: 'Role supplied at startup.',
        counterpart: 'Counterpart supplied at startup.',
        situation: 'Situation supplied at startup.',
        constraint: 'Limits supplied at startup.',
      },
      persona: {
        name: 'Public Persona',
        publicDescription: 'Public description supplied at startup.',
      },
    });
  });

  it('returns the two comparison Attempts with relative labels in rubric order', async () => {
    const previousAttempt = completedAttemptWithMarks(40, [
      false,
      true,
      false,
      false,
      true,
      false,
    ]);
    const thisAttempt = completedAttemptWithMarks(41, [
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
    const server = createApiServer({
      currentScenario: scenario,
      readComparisonAttempts: () =>
        Promise.resolve([thisAttempt, previousAttempt]),
    });
    servers.push(server);

    await new Promise<void>((resolveListening) => {
      server.listen(0, '127.0.0.1', resolveListening);
    });

    const port = (server.address() as AddressInfo).port;
    const response = await fetch(
      `http://127.0.0.1:${port}/api/attempts/comparison`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      status: 'ready',
      columns: ['Previous attempt', 'This attempt'],
      criteria: scenario.rubric.map((criterion, index) => ({
        criterionId: criterion.id,
        description: criterion.description,
        outcomes: [
          {
            met: previousAttempt.assessment.criteria[index]?.met,
            evidence: previousAttempt.assessment.criteria[index]?.evidence,
          },
          {
            met: thisAttempt.assessment.criteria[index]?.met,
            evidence: thisAttempt.assessment.criteria[index]?.evidence,
          },
        ],
      })),
    });
  });

  it('returns a coherent result when there is only one Attempt', async () => {
    const server = createApiServer({
      currentScenario: scenario,
      readComparisonAttempts: () =>
        Promise.resolve([
          completedAttemptWithMarks(1, [true, false, false, true, true, false]),
        ]),
    });
    servers.push(server);

    await new Promise<void>((resolveListening) => {
      server.listen(0, '127.0.0.1', resolveListening);
    });

    const port = (server.address() as AddressInfo).port;
    const response = await fetch(
      `http://127.0.0.1:${port}/api/attempts/comparison`
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'not-enough-attempts',
    });
  });

  it('rejects invalid comparison Attempt selections', async () => {
    const port = await startApiServer();
    const invalidQueries = [
      'attempt=0',
      'attempt=-1',
      'attempt=1.5',
      'attempt=0x10',
      'attempt=9007199254740992',
      'attempt=1&attempt=1',
      'attempt=1&attempt=2&attempt=3',
    ];

    for (const query of invalidQueries) {
      const response = await fetch(
        `http://127.0.0.1:${port}/api/attempts/comparison?${query}`
      );

      expect(response.status, query).toBe(400);
    }
  });

  it('mints a Scenario-configured credential without exposing Persona instructions', async () => {
    const realtimeScenario: Scenario = {
      ...scenario,
      persona: {
        ...scenario.persona,
        name: 'Persona supplied by the Scenario',
        characterBrief: 'Character brief supplied by the Scenario.',
        voice: 'cedar',
        openingLine: 'Opening line supplied by the Scenario.',
        deliveryRules: ['Delivery rule supplied by the Scenario.'],
        standingInstructions: [
          'Standing instruction supplied by the Scenario.',
        ],
        privateProfile: {
          actualIntent: 'Private intent supplied by the Scenario.',
          priorIncident: 'Private incident supplied by the Scenario.',
          meaningOfCancellation: 'Private meaning supplied by the Scenario.',
        },
        behaviourRules: ['Behaviour supplied by the Scenario.'],
        gate: {
          name: 'Gate supplied by the Scenario',
          condition: 'Gate condition supplied by the Scenario.',
        },
        hangUpPrecondition: {
          condition: 'Hang-up condition supplied by the Scenario.',
          rationale: 'Hang-up rationale supplied by the Scenario.',
        },
        hangUpToolDescription:
          'Hang-up tool description supplied by the Scenario.',
      },
    };
    const openAiFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          value: 'ephemeral-browser-credential',
          expires_at: 1_750_000_000,
          session: {
            instructions: 'The browser must never receive these instructions.',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    const server = createApiServer({
      currentScenario: realtimeScenario,
      mintRealtimeClientSecret: createOpenAiRealtimeClientSecretMinter({
        apiKey: 'server-api-key',
        fetch: openAiFetch,
      }),
    });
    servers.push(server);

    await new Promise<void>((resolveListening) => {
      server.listen(0, '127.0.0.1', resolveListening);
    });

    const port = (server.address() as AddressInfo).port;
    const response = await fetch(
      `http://127.0.0.1:${port}/api/realtime/client-secret`,
      { method: 'POST' }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      value: 'ephemeral-browser-credential',
      expiresAt: 1_750_000_000,
    });

    expect(openAiFetch).toHaveBeenCalledOnce();
    const [input, init] = openAiFetch.mock.calls[0] as [string, RequestInit];
    expect(input).toBe('https://api.openai.com/v1/realtime/client_secrets');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer server-api-key',
      'Content-Type': 'application/json',
    });

    expect(typeof init.body).toBe('string');

    if (typeof init.body !== 'string') {
      throw new Error('Expected the OpenAI request body to be JSON text.');
    }

    const body = JSON.parse(init.body) as {
      session: {
        model: string;
        output_modalities: string[];
        instructions: string;
        tools: {
          type: string;
          name: string;
          description: string;
          parameters: Record<string, unknown>;
        }[];
        truncation: string;
        audio: {
          output: {
            voice: string;
          };
        };
      };
    };
    expect(body.session.model).toBe('gpt-realtime-2.1');
    expect(body.session.output_modalities).toEqual(['audio']);
    expect(body.session.truncation).toBe('disabled');
    expect(body.session.audio.output.voice).toBe('cedar');
    expect(body.session.tools).toEqual([
      {
        type: 'function',
        name: 'hang_up',
        description: 'Hang-up tool description supplied by the Scenario.',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
    ]);
    expect(JSON.stringify(body.session)).not.toContain('transcription');
    expect(JSON.stringify(body.session)).not.toContain('transcribe');
    expect(body.session.instructions).toContain(
      'Character brief supplied by the Scenario.'
    );
    expect(body.session.instructions).toContain(
      'Opening line supplied by the Scenario.'
    );
    expect(body.session.instructions).toContain(
      'Delivery rule supplied by the Scenario.'
    );
    expect(body.session.instructions).toContain(
      'Standing instruction supplied by the Scenario.'
    );
    expect(body.session.instructions).toContain(
      'Private incident supplied by the Scenario.'
    );
    expect(body.session.instructions).toContain(
      'Behaviour supplied by the Scenario.'
    );
    expect(body.session.instructions).toContain(
      'Gate condition supplied by the Scenario.'
    );
    expect(body.session.instructions).toContain(
      'Hang-up condition supplied by the Scenario.'
    );
    expect(body.session.instructions).toContain(
      'Hang-up rationale supplied by the Scenario.'
    );
  });

  it('stores a completed Attempt raw event log without changing it', async () => {
    const storedLogs: string[] = [];
    const server = createApiServer({
      currentScenario: scenario,
      completeAttempt: (rawEventLog) => {
        storedLogs.push(rawEventLog);

        return Promise.resolve(completedAttempt);
      },
    });
    servers.push(server);

    await new Promise<void>((resolveListening) => {
      server.listen(0, '127.0.0.1', resolveListening);
    });

    const port = (server.address() as AddressInfo).port;
    const rawEventLog =
      '[{"type":"response.output_text.done","item_id":"transcript-item","text":"What happened?"},{"type":"input_audio_buffer.committed","item_id":"trainee-turn","previous_item_id":"persona-turn"}]';
    const response = await fetch(
      `http://127.0.0.1:${port}/api/attempts/raw-event-log`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawEventLog,
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(completedAttempt);
    expect(storedLogs).toEqual([rawEventLog]);
  });

  it('reconstructs a Transcript without completing an Attempt', async () => {
    const completeAttempt = vi.fn(() => Promise.resolve(completedAttempt));
    const server = createApiServer({
      currentScenario: scenario,
      completeAttempt,
    });
    servers.push(server);

    await new Promise<void>((resolveListening) => {
      server.listen(0, '127.0.0.1', resolveListening);
    });

    const port = (server.address() as AddressInfo).port;
    const rawEventLog = JSON.stringify(
      [
        {
          type: 'conversation.item.added',
          previous_item_id: null,
          item: {
            id: 'persona-turn',
            role: 'assistant',
            content: [{ type: 'output_audio' }],
          },
        },
        {
          type: 'response.output_audio_transcript.done',
          item_id: 'persona-turn',
          transcript: "I'd like to close my account.",
        },
        {
          type: 'conversation.item.added',
          previous_item_id: 'persona-turn',
          item: {
            id: 'trainee-turn',
            role: 'user',
            content: [{ type: 'input_audio' }],
          },
        },
        {
          type: 'response.done',
          response: {
            metadata: {
              purpose: 'turn_transcription',
              source_item_id: 'trainee-turn',
            },
            output: [
              {
                content: [
                  {
                    type: 'output_text',
                    text: 'Can you tell me what happened?',
                  },
                ],
              },
            ],
          },
        },
      ].map((event) => ({
        direction: 'server',
        event: JSON.stringify(event),
      }))
    );
    const response = await fetch(
      `http://127.0.0.1:${port}/api/attempts/transcript`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawEventLog,
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual([
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
    ]);
    expect(completeAttempt).not.toHaveBeenCalled();
  });

  it('returns completed turns while a live turn is awaiting text', async () => {
    const completeAttempt = vi.fn(() => Promise.resolve(completedAttempt));
    const server = createApiServer({
      currentScenario: scenario,
      completeAttempt,
    });
    servers.push(server);

    await new Promise<void>((resolveListening) => {
      server.listen(0, '127.0.0.1', resolveListening);
    });

    const port = (server.address() as AddressInfo).port;
    const rawEventLog = JSON.stringify(
      [
        {
          type: 'conversation.item.added',
          previous_item_id: null,
          item: {
            id: 'persona-turn',
            role: 'assistant',
            content: [{ type: 'output_audio' }],
          },
        },
        {
          type: 'response.output_audio_transcript.done',
          item_id: 'persona-turn',
          transcript: "I'd like to close my account.",
        },
        {
          type: 'conversation.item.added',
          previous_item_id: 'persona-turn',
          item: {
            id: 'trainee-turn',
            role: 'user',
            content: [{ type: 'input_audio' }],
          },
        },
        {
          type: 'conversation.item.added',
          previous_item_id: 'trainee-turn',
          item: {
            id: 'next-persona-turn',
            role: 'assistant',
            content: [{ type: 'output_audio' }],
          },
        },
        {
          type: 'response.output_audio_transcript.done',
          item_id: 'next-persona-turn',
          transcript: 'The last call was the problem.',
        },
      ].map((event) => ({
        direction: 'server',
        event: JSON.stringify(event),
      }))
    );
    const response = await fetch(
      `http://127.0.0.1:${port}/api/attempts/transcript`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawEventLog,
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        speaker: 'persona',
        text: "I'd like to close my account.",
        cutOff: false,
      },
      {
        speaker: 'trainee',
        status: 'awaiting-text',
        itemId: 'trainee-turn',
      },
      {
        speaker: 'persona',
        text: 'The last call was the problem.',
        cutOff: false,
      },
    ]);
    expect(completeAttempt).not.toHaveBeenCalled();
  });

  it.each([
    ['hang-up-without-a-closing-line.json', 26],
    ['persona-out-of-band-2.json', 43],
    ['persona-out-of-band-3.json', 33],
  ])(
    'reads a valid pending snapshot from captured prefix %s',
    async (fixtureName, prefixLength) => {
      const completeAttempt = vi.fn(() => Promise.resolve(completedAttempt));
      const server = createApiServer({
        currentScenario: scenario,
        completeAttempt,
      });
      servers.push(server);

      await new Promise<void>((resolveListening) => {
        server.listen(0, '127.0.0.1', resolveListening);
      });

      const port = (server.address() as AddressInfo).port;
      const evidencePath = resolve(
        '.scratch',
        'conversation-practice',
        'evidence',
        fixtureName
      );
      const envelopes = JSON.parse(
        await readFile(evidencePath, 'utf8')
      ) as unknown[];
      const response = await fetch(
        `http://127.0.0.1:${port}/api/attempts/transcript`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(envelopes.slice(0, prefixLength)),
        }
      );

      expect(response.status).toBe(200);
      const snapshot = (await response.json()) as Record<string, unknown>[];
      expect(snapshot.some((turn) => turn.status === 'awaiting-text')).toBe(
        true
      );
      expect(snapshot.some((turn) => typeof turn.text === 'string')).toBe(true);
      expect(completeAttempt).not.toHaveBeenCalled();
    }
  );

  it('logs the diagnostic when a live Transcript chain is invalid', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const port = await startApiServer();
    const rawEventLog = JSON.stringify(
      [
        {
          type: 'conversation.item.added',
          previous_item_id: null,
          item: {
            id: 'first-turn',
            role: 'assistant',
            content: [{ type: 'output_audio' }],
          },
        },
        {
          type: 'conversation.item.added',
          previous_item_id: null,
          item: {
            id: 'second-turn',
            role: 'user',
            content: [{ type: 'input_audio' }],
          },
        },
      ].map((event) => ({
        direction: 'server',
        event: JSON.stringify(event),
      }))
    );
    const response = await fetch(
      `http://127.0.0.1:${port}/api/attempts/transcript`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawEventLog,
      }
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: 'Transcript could not be reconstructed.',
    });
    expect(consoleError).toHaveBeenCalledWith(
      'Debug Transcript could not be reconstructed.',
      expect.objectContaining({
        message: 'The raw event log has an ambiguous turn chain.',
      })
    );
    consoleError.mockRestore();
  });

  it('rejects non-JSON and oversized raw event logs before storage', async () => {
    const storeRawEventLog = vi.fn(() => Promise.resolve(completedAttempt));
    const server = createApiServer({
      currentScenario: scenario,
      completeAttempt: storeRawEventLog,
      rawEventLogByteLimit: 64,
    });
    servers.push(server);

    await new Promise<void>((resolveListening) => {
      server.listen(0, '127.0.0.1', resolveListening);
    });

    const port = (server.address() as AddressInfo).port;
    const nonJsonResponse = await fetch(
      `http://127.0.0.1:${port}/api/attempts/raw-event-log`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not json',
      }
    );
    const oversizedResponse = await fetch(
      `http://127.0.0.1:${port}/api/attempts/raw-event-log`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(['x'.repeat(100)]),
      }
    );

    expect(nonJsonResponse.status).toBe(415);
    expect(oversizedResponse.status).toBe(413);
    expect(storeRawEventLog).not.toHaveBeenCalled();
  });

  it('is reachable through the page development server', async () => {
    const apiPort = await startApiServer();
    await writeFile(proxyEnvironmentPath, `SERVER_PORT=${apiPort}\n`);
    delete process.env.SERVER_PORT;

    const pageServer = await createViteServer({
      configFile: resolve('vite.config.ts'),
      logLevel: 'silent',
      mode: proxyMode,
      server: {
        host: '127.0.0.1',
        port: 0,
      },
    });
    viteServers.push(pageServer);
    await pageServer.listen();

    const pageAddress = pageServer.httpServer?.address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${pageAddress.port}/api/health`
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
