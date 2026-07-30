import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { scenario } from '../src/scenario.js';
import {
  createAttemptCompleter,
  type Assessment,
  type Transcript,
} from '../src/server/attempt-completion.js';
import { createApiServer } from '../src/server/app.js';
import {
  createLatestAttemptReader,
  createAttemptStore,
  type Attempt,
} from '../src/server/attempt-store.js';
import {
  createRawEventLogStore,
  type StoreRawEventLog,
} from '../src/server/raw-event-log.js';

const fixtureDirectory = resolve('test', 'fixtures', 'raw-event-logs');
const servers: ReturnType<typeof createApiServer>[] = [];
const temporaryDirectories: string[] = [];
const expectedCleanTranscript: Transcript = [
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
];

async function startCompletionServer(
  attemptDirectory: string,
  storeRawEventLog?: StoreRawEventLog
) {
  const completeAttempt = createAttemptCompleter({
    scenario,
    assessAttempt: (transcript, rubric) => {
      const criterion = rubric.find(({ id }) => id === 'asked-open-question');
      const traineeTurn = transcript.find(
        ({ speaker }) => speaker === 'trainee'
      );
      const assessment: Assessment = {
        criteria: [
          {
            criterionId: criterion?.id ?? 'rubric-not-received',
            met: criterion !== undefined && traineeTurn !== undefined,
            evidence: traineeTurn?.text ?? 'transcript-not-received',
          },
        ],
      };

      return Promise.resolve(assessment);
    },
    createFeedback: (receivedAssessment, transcript) =>
      Promise.resolve(
        receivedAssessment.criteria[0]?.met === true &&
          transcript.at(-1)?.speaker === 'persona'
          ? 'Assessment and Transcript received.'
          : 'Judging inputs were incomplete.'
      ),
    storeAttempt: createAttemptStore(attemptDirectory),
    storeRawEventLog,
  });
  const server = createApiServer(
    scenario,
    undefined,
    completeAttempt,
    undefined,
    createLatestAttemptReader(attemptDirectory)
  );
  servers.push(server);

  await new Promise<void>((resolveListening) => {
    server.listen(0, '127.0.0.1', resolveListening);
  });

  return (server.address() as AddressInfo).port;
}

async function createTemporaryDirectory(kind = 'attempts') {
  const directory = await mkdtemp(
    resolve(tmpdir(), `conversation-practice-${kind}-`)
  );
  temporaryDirectories.push(directory);
  return directory;
}

function shuffleWithSeed<T>(values: readonly T[], seed: number): T[] {
  let state = seed >>> 0;
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const swapIndex = Math.floor((state / 0x1_0000_0000) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

async function readFixture(fixtureName: string) {
  return readFile(resolve(fixtureDirectory, fixtureName), 'utf8');
}

async function readOnlyFile(directory: string) {
  const filenames = await readdir(directory);

  if (filenames.length !== 1 || filenames[0] === undefined) {
    throw new Error(`Expected one file in ${directory}.`);
  }

  return readFile(resolve(directory, filenames[0]), 'utf8');
}

function removeFirstTraineeTranscription(rawEventLog: string) {
  const envelopes = JSON.parse(rawEventLog) as Record<string, unknown>[];
  let removed = false;
  const incompleteEnvelopes = envelopes.filter((envelope) => {
    if (removed || typeof envelope.event !== 'string') {
      return true;
    }

    const event = JSON.parse(envelope.event) as Record<string, unknown>;
    const response =
      typeof event.response === 'object' && event.response !== null
        ? (event.response as Record<string, unknown>)
        : undefined;
    const metadata =
      typeof response?.metadata === 'object' && response.metadata !== null
        ? (response.metadata as Record<string, unknown>)
        : undefined;

    if (
      event.type === 'response.done' &&
      metadata?.purpose === 'turn_transcription'
    ) {
      removed = true;
      return false;
    }

    return true;
  });

  if (!removed) {
    throw new Error('Fixture did not contain a Trainee transcription.');
  }

  return JSON.stringify(incompleteEnvelopes);
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
  vi.restoreAllMocks();
});

describe('completed Attempts', () => {
  it('persists a numbered Attempt reconstructed from a recorded event log', async () => {
    const attemptDirectory = await createTemporaryDirectory();
    const rawEventLogDirectory = await createTemporaryDirectory('raw-logs');
    const port = await startCompletionServer(
      attemptDirectory,
      createRawEventLogStore(rawEventLogDirectory)
    );
    const rawEventLog = await readFixture('clean-stop-in-silence.json');

    const response = await postRawEventLog(port, rawEventLog);

    expect(response.status).toBe(200);
    const scenarioDirectory = resolve(
      attemptDirectory,
      'customer-whos-had-enough'
    );
    expect(await readdir(scenarioDirectory)).toEqual(['0001.json']);
    const expectedAttempt: Attempt = {
      scenarioId: 'customer-whos-had-enough',
      number: 1,
      transcript: expectedCleanTranscript,
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
    };
    await expect(response.json()).resolves.toEqual(expectedAttempt);
    await expect(
      readFile(resolve(scenarioDirectory, '0001.json'), 'utf8').then(JSON.parse)
    ).resolves.toEqual(expectedAttempt);
    await expect(readOnlyFile(rawEventLogDirectory)).resolves.toBe(rawEventLog);
  });

  it('reconstructs the same Transcript after the event envelopes are shuffled', async () => {
    const attemptDirectory = await createTemporaryDirectory();
    const port = await startCompletionServer(attemptDirectory);
    const rawEventLog = await readFixture('clean-stop-in-silence.json');
    const envelopes = JSON.parse(rawEventLog) as unknown[];
    const shuffledEnvelopes = shuffleWithSeed(envelopes, 0x05a77e);
    const shuffledEventLog = JSON.stringify(shuffledEnvelopes);

    const shuffledResponse = await postRawEventLog(port, shuffledEventLog);

    expect(shuffledEnvelopes).not.toEqual(envelopes);
    expect(shuffledResponse.status).toBe(200);
    const attempt = await readPersistedAttempt(attemptDirectory, 1);
    expect(attempt.transcript).toEqual(expectedCleanTranscript);
  });

  it('persists the judged Attempt when raw-log archival fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const attemptDirectory = await createTemporaryDirectory();
    const port = await startCompletionServer(attemptDirectory, () =>
      Promise.reject(new Error('Raw-log disk unavailable.'))
    );

    const response = await postFixture(port, 'clean-stop-in-silence.json');

    expect(response.status).toBe(200);
    const attempt = await readPersistedAttempt(attemptDirectory, 1);
    expect(attempt.transcript).toEqual(expectedCleanTranscript);
  });

  it('keeps the raw log but rejects an Attempt with a reconstruction gap', async () => {
    const attemptDirectory = await createTemporaryDirectory();
    const rawEventLogDirectory = await createTemporaryDirectory('raw-logs');
    const port = await startCompletionServer(
      attemptDirectory,
      createRawEventLogStore(rawEventLogDirectory)
    );
    const rawEventLog = await readFixture('clean-stop-in-silence.json');
    const incompleteRawEventLog = removeFirstTraineeTranscription(rawEventLog);

    const incompleteResponse = await postRawEventLog(
      port,
      incompleteRawEventLog
    );

    expect(incompleteResponse.status).toBe(500);
    await expect(readOnlyFile(rawEventLogDirectory)).resolves.toBe(
      incompleteRawEventLog
    );
    await expect(
      readdir(resolve(attemptDirectory, 'customer-whos-had-enough'))
    ).rejects.toMatchObject({ code: 'ENOENT' });

    const completeResponse = await postRawEventLog(port, rawEventLog);

    expect(completeResponse.status).toBe(200);
    const firstAttempt = await readPersistedAttempt(attemptDirectory, 1);
    expect(firstAttempt.number).toBe(1);
  });

  it('increments Attempt numbers within the Scenario', async () => {
    const attemptDirectory = await createTemporaryDirectory();
    const port = await startCompletionServer(attemptDirectory);

    await postFixture(port, 'clean-stop-in-silence.json');
    const secondResponse = await postFixture(
      port,
      'clean-stop-in-silence.json'
    );

    expect(secondResponse.status).toBe(200);
    const secondAttempt = await readPersistedAttempt(attemptDirectory, 2);
    expect(secondAttempt.number).toBe(2);
  });

  it('reads the latest persisted Attempt for the current Scenario', async () => {
    const attemptDirectory = await createTemporaryDirectory();
    const port = await startCompletionServer(attemptDirectory);

    const missingResponse = await fetch(
      `http://127.0.0.1:${port}/api/attempts/latest`
    );

    expect(missingResponse.status).toBe(404);

    await postFixture(port, 'clean-stop-in-silence.json');
    await postFixture(port, 'clean-stop-in-silence.json');
    const latestResponse = await fetch(
      `http://127.0.0.1:${port}/api/attempts/latest`
    );

    expect(latestResponse.status).toBe(200);
    await expect(latestResponse.json()).resolves.toMatchObject({
      scenarioId: scenario.id,
      number: 2,
      feedback: 'Assessment and Transcript received.',
    });
  });

  it('reads the latest Attempt by number beyond the padded filename range', async () => {
    const attemptDirectory = await createTemporaryDirectory();
    const scenarioDirectory = resolve(
      attemptDirectory,
      encodeURIComponent(scenario.id)
    );
    await mkdir(scenarioDirectory);
    const persistedAttempt = {
      scenarioId: scenario.id,
      transcript: [],
      assessment: { criteria: [] },
      feedback: 'Persisted Feedback.',
    };
    await Promise.all([
      writeFile(
        resolve(scenarioDirectory, '9999.json'),
        JSON.stringify({ ...persistedAttempt, number: 9_999 })
      ),
      writeFile(
        resolve(scenarioDirectory, '10000.json'),
        JSON.stringify({ ...persistedAttempt, number: 10_000 })
      ),
    ]);

    await expect(
      createLatestAttemptReader(attemptDirectory)(scenario.id)
    ).resolves.toMatchObject({ number: 10_000 });
  });

  it('marks a Persona turn cut off when the Trainee stops mid-conversation', async () => {
    const attemptDirectory = await createTemporaryDirectory();
    const port = await startCompletionServer(attemptDirectory);

    const response = await postFixture(
      port,
      'stop-while-persona-speaking.json'
    );

    expect(response.status).toBe(200);
    const attempt = await readPersistedAttempt(attemptDirectory, 1);
    expect(attempt.transcript.at(-1)).toEqual({
      speaker: 'persona',
      text: 'Three weeks ago I called with a simple question, and the rep sounded rushed and dismissive. It made me feel stupid for even asking. That’s why I’m done, not because of the price.',
      cutOff: true,
      audioEndMs: 2180,
    });
  });

  it('preserves cut-off Persona turns in the middle of the Transcript', async () => {
    const attemptDirectory = await createTemporaryDirectory();
    const port = await startCompletionServer(attemptDirectory);

    const response = await postFixture(port, 'trainee-interrupts-persona.json');

    expect(response.status).toBe(200);
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
