import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { scenario } from '../src/scenario.js';
import {
  createAttemptCompleter,
  type Assessment,
} from '../src/server/attempt-completion.js';
import { createApiServer } from '../src/server/app.js';
import {
  createAttemptStore,
  type Attempt,
} from '../src/server/attempt-store.js';

const fixtureDirectory = resolve('test', 'fixtures', 'raw-event-logs');
const servers: ReturnType<typeof createApiServer>[] = [];
const temporaryDirectories: string[] = [];

async function startCompletionServer(attemptDirectory: string) {
  const assessment: Assessment = {
    criteria: [
      {
        criterionId: 'asked-open-question',
        met: true,
        evidence: 'Can you tell me what happened?',
      },
    ],
  };
  const completeAttempt = createAttemptCompleter({
    scenario,
    assessAttempt: () => Promise.resolve(assessment),
    createFeedback: (receivedAssessment, transcript) =>
      Promise.resolve(
        receivedAssessment.criteria[0]?.met === true &&
          transcript.at(-1)?.speaker === 'persona'
          ? 'Assessment and Transcript received.'
          : 'Judging inputs were incomplete.'
      ),
    storeAttempt: createAttemptStore(attemptDirectory),
  });
  const server = createApiServer(scenario, undefined, completeAttempt);
  servers.push(server);

  await new Promise<void>((resolveListening) => {
    server.listen(0, '127.0.0.1', resolveListening);
  });

  return (server.address() as AddressInfo).port;
}

async function createTemporaryAttemptDirectory() {
  const directory = await mkdtemp(
    resolve(tmpdir(), 'conversation-practice-attempts-')
  );
  temporaryDirectories.push(directory);
  return directory;
}

async function readFixture(fixtureName: string) {
  return readFile(resolve(fixtureDirectory, fixtureName), 'utf8');
}

async function postRawEventLog(port: number, rawEventLog: string) {
  return fetch(`http://127.0.0.1:${port}/api/attempts/raw-event-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawEventLog,
  });
}

async function postFixture(port: number, fixtureName: string) {
  return postRawEventLog(port, await readFixture(fixtureName));
}

async function readPersistedAttempt(
  attemptDirectory: string,
  number: number
): Promise<Attempt> {
  const filename = `${String(number).padStart(4, '0')}.json`;
  const contents = await readFile(
    resolve(attemptDirectory, 'customer-whos-had-enough', filename),
    'utf8'
  );

  return JSON.parse(contents) as Attempt;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolveClose, reject) => {
          server.close((error) => (error ? reject(error) : resolveClose()));
        })
    )
  );
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

describe('completed Attempts', () => {
  it('persists a numbered Attempt reconstructed from a recorded event log', async () => {
    const attemptDirectory = await createTemporaryAttemptDirectory();
    const port = await startCompletionServer(attemptDirectory);

    const response = await postFixture(port, 'clean-stop-in-silence.json');

    expect(response.status).toBe(204);
    const scenarioDirectory = resolve(
      attemptDirectory,
      'customer-whos-had-enough'
    );
    expect(await readdir(scenarioDirectory)).toEqual(['0001.json']);
    await expect(
      readFile(resolve(scenarioDirectory, '0001.json'), 'utf8').then(JSON.parse)
    ).resolves.toEqual({
      scenarioId: 'customer-whos-had-enough',
      number: 1,
      transcript: [
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
        {
          speaker: 'persona',
          text: 'Fees are too high, and I can get something cheaper somewhere else. That’s the reason.',
          cutOff: false,
        },
        {
          speaker: 'trainee',
          text: 'What was it about that call that bothered you?',
          cutOff: false,
        },
        {
          speaker: 'persona',
          text: 'Three weeks ago I called with a simple question, and the person sounded rushed and dismissive. It left me feeling stupid for even asking. That stuck with me.',
          cutOff: false,
        },
        {
          speaker: 'trainee',
          text: 'So you called with a simple question and came away feeling stupid for asking?',
          cutOff: false,
        },
        {
          speaker: 'persona',
          text: 'Yeah. That’s exactly how it felt. I know it might not seem like a big deal, but being talked to like that over something small just kind of shut me down. If we can avoid that happening again, I’m open to talking.',
          cutOff: false,
        },
        {
          speaker: 'trainee',
          text: 'That shouldn’t have happened to you.',
          cutOff: false,
        },
        {
          speaker: 'persona',
          text: 'Thank you. I appreciate you saying that, and saying it plainly.\n\nI don’t need a discount or anything. I just want to know that if I call again, I’ll be treated with basic patience. If that’s something you can stand behind, I’m willing to stick around.',
          cutOff: false,
        },
      ],
      assessment: {
        criteria: [
          {
            criterionId: 'asked-open-question',
            met: true,
            evidence: 'Can you tell me what happened?',
          },
        ],
      },
      feedback: 'Assessment and Transcript received.',
    });
  });

  it('reconstructs the same Transcript after the event envelopes are shuffled', async () => {
    const attemptDirectory = await createTemporaryAttemptDirectory();
    const port = await startCompletionServer(attemptDirectory);
    const rawEventLog = await readFixture('clean-stop-in-silence.json');
    const envelopes = JSON.parse(rawEventLog) as unknown[];
    const shuffledEventLog = JSON.stringify([...envelopes].reverse());

    const originalResponse = await postRawEventLog(port, rawEventLog);
    const shuffledResponse = await postRawEventLog(port, shuffledEventLog);

    expect([originalResponse.status, shuffledResponse.status]).toEqual([
      204, 204,
    ]);
    const firstAttempt = await readPersistedAttempt(attemptDirectory, 1);
    const secondAttempt = await readPersistedAttempt(attemptDirectory, 2);
    expect(secondAttempt.number).toBe(2);
    expect(secondAttempt.transcript).toEqual(firstAttempt.transcript);
  });

  it('marks a Persona turn cut off when the Trainee stops mid-conversation', async () => {
    const attemptDirectory = await createTemporaryAttemptDirectory();
    const port = await startCompletionServer(attemptDirectory);

    const response = await postFixture(
      port,
      'stop-while-persona-speaking.json'
    );

    expect(response.status).toBe(204);
    const attempt = await readPersistedAttempt(attemptDirectory, 1);
    expect(attempt.transcript.at(-1)).toEqual({
      speaker: 'persona',
      text: 'Three weeks ago I called with a simple question, and the rep sounded rushed and dismissive. It made me feel stupid for even asking. That’s why I’m done, not because of the price.',
      cutOff: true,
      audioEndMs: 2180,
    });
  });

  it('preserves cut-off Persona turns in the middle of the Transcript', async () => {
    const attemptDirectory = await createTemporaryAttemptDirectory();
    const port = await startCompletionServer(attemptDirectory);

    const response = await postFixture(port, 'trainee-interrupts-persona.json');

    expect(response.status).toBe(204);
    const attempt = await readPersistedAttempt(attemptDirectory, 1);
    expect(attempt.transcript).toEqual([
      {
        speaker: 'persona',
        text: "I'd like to close my account.",
        cutOff: true,
        audioEndMs: 1640,
      },
      {
        speaker: 'trainee',
        text: 'What happened?',
        cutOff: false,
      },
      {
        speaker: 'persona',
        text: 'Fees are too high, and I can get something cheaper somewhere else.',
        cutOff: true,
        audioEndMs: 1080,
      },
      {
        speaker: 'trainee',
        text: 'Tell me more.',
        cutOff: false,
      },
      {
        speaker: 'persona',
        text: 'Somewhere else is cheaper, and the fees here add up. It’s just not worth it to keep paying more when I don’t feel like I’m getting anything extra.',
        cutOff: true,
        audioEndMs: 1940,
      },
      {
        speaker: 'trainee',
        text: 'What did they say to you?',
        cutOff: false,
      },
      {
        speaker: 'persona',
        text: 'Three weeks ago I called with a simple question, and the person sounded rushed and dismissive. The way they spoke made me feel stupid for even asking. That’s why I’m done.',
        cutOff: false,
      },
    ]);
  });
});
