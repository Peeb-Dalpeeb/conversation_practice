import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Assessment, Transcript } from './attempt-completion.js';

export type Attempt = {
  scenarioId: string;
  number: number;
  transcript: Transcript;
  assessment: Assessment;
  feedback: string;
};

export type UnnumberedAttempt = Omit<Attempt, 'number'>;
export type StoreAttempt = (attempt: UnnumberedAttempt) => Promise<Attempt>;

function isFileExistsError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'EEXIST'
  );
}

export function createAttemptStore(
  directory = resolve('data', 'attempts')
): StoreAttempt {
  return async (attempt) => {
    const scenarioDirectory = resolve(
      directory,
      encodeURIComponent(attempt.scenarioId)
    );
    await mkdir(scenarioDirectory, { recursive: true });

    const filenames = await readdir(scenarioDirectory);
    let number =
      Math.max(
        0,
        ...filenames.map((filename) => {
          const match = /^(\d+)\.json$/.exec(filename);
          return match ? Number(match[1]) : 0;
        })
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
