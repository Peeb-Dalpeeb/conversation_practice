import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Assessment, Transcript } from './attempt-completion.js';

export type FeedbackOutcome =
  | {
      status: 'completed';
      prose: string;
    }
  | {
      status: 'failed';
      error: string;
    };

export type Attempt = {
  scenarioId: string;
  number: number;
  transcript: Transcript;
  assessment: Assessment;
  feedback: FeedbackOutcome;
};

export type UnnumberedAttempt = Omit<Attempt, 'number'>;
export type StoreAttempt = (attempt: UnnumberedAttempt) => Promise<Attempt>;
export type ReadLatestAttempt = (
  scenarioId: string
) => Promise<Attempt | undefined>;

function isFileExistsError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'EEXIST'
  );
}

function scenarioAttemptDirectory(directory: string, scenarioId: string) {
  return resolve(directory, encodeURIComponent(scenarioId));
}

function attemptNumberFromFilename(filename: string): number | undefined {
  const match = /^(\d+)\.json$/.exec(filename);
  return match ? Number(match[1]) : undefined;
}

export function createAttemptStore(
  directory = resolve('data', 'attempts')
): StoreAttempt {
  return async (attempt) => {
    const scenarioDirectory = scenarioAttemptDirectory(
      directory,
      attempt.scenarioId
    );
    await mkdir(scenarioDirectory, { recursive: true });

    const filenames = await readdir(scenarioDirectory);
    let number =
      Math.max(
        0,
        ...filenames.map((filename) => attemptNumberFromFilename(filename) ?? 0)
      ) + 1;

    for (;;) {
      const numberedAttempt = { ...attempt, number };
      const filename = `${String(number).padStart(4, '0')}.json`;

      try {
        await writeFile(
          resolve(scenarioDirectory, filename),
          `${JSON.stringify(numberedAttempt, null, 2)}\n`,
          { encoding: 'utf8', flag: 'wx' }
        );
        return numberedAttempt;
      } catch (error) {
        if (!isFileExistsError(error)) {
          throw error;
        }

        number += 1;
      }
    }
  };
}

export function createLatestAttemptReader(
  directory = resolve('data', 'attempts')
): ReadLatestAttempt {
  return async (scenarioId) => {
    const scenarioDirectory = scenarioAttemptDirectory(directory, scenarioId);
    let filenames: string[];

    try {
      filenames = await readdir(scenarioDirectory);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return undefined;
      }

      throw error;
    }

    const latestAttemptFile = filenames.reduce<
      { filename: string; number: number } | undefined
    >((latest, filename) => {
      const number = attemptNumberFromFilename(filename);

      return number !== undefined && (!latest || number > latest.number)
        ? { filename, number }
        : latest;
    }, undefined);

    if (!latestAttemptFile) {
      return undefined;
    }

    const contents = await readFile(
      resolve(scenarioDirectory, latestAttemptFile.filename),
      'utf8'
    );

    return JSON.parse(contents) as Attempt;
  };
}
