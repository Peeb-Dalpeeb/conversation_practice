import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Transcript } from '../transcript.js';
import type { Assessment } from './attempt-completion.js';

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
  rawEventLogId?: string;
  transcript: Transcript;
  assessment: Assessment;
  feedback: FeedbackOutcome;
};

export type UnnumberedAttempt = Omit<Attempt, 'number'>;
export type ComparisonAttempt = Pick<
  Attempt,
  'scenarioId' | 'number' | 'assessment'
>;
export type StoreAttempt = (attempt: UnnumberedAttempt) => Promise<Attempt>;
export type ReadLatestAttempt = (
  scenarioId: string
) => Promise<Attempt | undefined>;
export type ReadComparisonAttempts = (
  scenarioId: string,
  attemptNumbers?: readonly number[]
) => Promise<readonly ComparisonAttempt[]>;

function isFileExistsError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'EEXIST'
  );
}

function isFileMissingError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

function scenarioAttemptDirectory(directory: string, scenarioId: string) {
  return resolve(directory, encodeURIComponent(scenarioId));
}

function attemptNumberFromFilename(filename: string): number | undefined {
  const match = /^(\d+)\.json$/.exec(filename);

  if (!match) {
    return undefined;
  }

  const number = Number(match[1]);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isReadableComparisonAttempt(
  value: unknown
): value is ComparisonAttempt {
  if (
    !isRecord(value) ||
    typeof value.scenarioId !== 'string' ||
    typeof value.number !== 'number' ||
    !Number.isSafeInteger(value.number) ||
    value.number <= 0 ||
    !isRecord(value.assessment) ||
    !Array.isArray(value.assessment.criteria)
  ) {
    return false;
  }

  return value.assessment.criteria.every(
    (criterion) =>
      isRecord(criterion) &&
      typeof criterion.criterionId === 'string' &&
      typeof criterion.met === 'boolean' &&
      typeof criterion.evidence === 'string'
  );
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

export function createComparisonAttemptReader(
  directory = resolve('data', 'attempts')
): ReadComparisonAttempts {
  return async (scenarioId, attemptNumbers) => {
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
        return [];
      }

      throw error;
    }

    const selectedAttemptNumbers = attemptNumbers
      ? new Set(attemptNumbers)
      : undefined;
    const comparisonFiles = filenames
      .flatMap((filename) => {
        const number = attemptNumberFromFilename(filename);
        return number === undefined ||
          (selectedAttemptNumbers && !selectedAttemptNumbers.has(number))
          ? []
          : [{ filename, number }];
      })
      .sort((left, right) => left.number - right.number);

    const attempts = await Promise.all(
      comparisonFiles.map(async ({ filename, number }) => {
        let contents: string;

        try {
          contents = await readFile(
            resolve(scenarioDirectory, filename),
            'utf8'
          );
        } catch (error) {
          if (isFileMissingError(error)) {
            return undefined;
          }

          throw error;
        }

        let attempt: unknown;

        try {
          attempt = JSON.parse(contents);
        } catch (error) {
          if (!(error instanceof SyntaxError)) {
            throw error;
          }

          console.warn(`Skipping malformed Attempt file ${filename}.`);
          return undefined;
        }

        if (
          !isReadableComparisonAttempt(attempt) ||
          attempt.scenarioId !== scenarioId ||
          attempt.number !== number
        ) {
          console.warn(`Skipping malformed Attempt file ${filename}.`);
          return undefined;
        }

        return { attempt, filename };
      })
    );

    const attemptsByNumber = new Map<
      number,
      { attempt: ComparisonAttempt; filename: string }
    >();

    for (const result of attempts) {
      if (!result) {
        continue;
      }

      const current = attemptsByNumber.get(result.attempt.number);
      const canonicalFilename = `${String(result.attempt.number).padStart(4, '0')}.json`;

      if (!current || result.filename === canonicalFilename) {
        attemptsByNumber.set(result.attempt.number, result);
      }
    }

    return [...attemptsByNumber.values()]
      .map(({ attempt }) => attempt)
      .sort((left, right) => left.number - right.number);
  };
}
