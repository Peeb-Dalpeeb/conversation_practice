// Re-runs the Assessment over persisted Attempts without modifying their records.
//
// Dry readback:
//   npx tsx .scratch/conversation-practice/regrade-attempt.ts 12 21
// Live regrade (sends the Transcript, Rubric, and Private Profile to OpenAI):
//   npx tsx .scratch/conversation-practice/regrade-attempt.ts 12 21 --live
// Repeat to expose model variation, with optional strict evidence checks:
//   npx tsx .scratch/conversation-practice/regrade-attempt.ts 1 --live --repeat=3 --assert-stable
//   npx tsx .scratch/conversation-practice/regrade-attempt.ts 14 --live --assert-distinct
import 'dotenv/config';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { scenario } from '../../src/scenario.js';
import { createOpenAiAttemptAssessor } from '../../src/server/assessment.js';
import type { Assessment } from '../../src/server/attempt-completion.js';
import { readServerEnvironment } from '../../src/server/environment.js';
import type { Transcript } from '../../src/transcript.js';

type PersistedAttempt = {
  number: number;
  transcript: Transcript;
  assessment: Assessment;
};

type KnownExpectation = {
  criterionId?: string;
  met?: boolean;
  metCount?: number;
  evidence?: string;
};

const knownExpectations = new Map<number, KnownExpectation>([
  [
    4,
    {
      criterionId: 'surfaced-real-reason',
      met: false,
      metCount: 0,
      evidence: 'I can offer you a discount on your next six months.',
    },
  ],
  [
    11,
    {
      criterionId: 'surfaced-real-reason',
      met: false,
      metCount: 0,
      evidence: 'I can offer you a discount on your next six months',
    },
  ],
  [12, { criterionId: 'asked-open-question', met: false }],
  // The demo's own shape: four offers with Jordan volunteering the cover story
  // at the end. No fixture reproduces it, and it is the shape whose criterion 3
  // read Jordan's cover story in ticket 13's first two rehearsals and the third
  // offer in the third measurement. Pinned so the boundary cannot drift back.
  [
    29,
    {
      criterionId: 'surfaced-real-reason',
      met: false,
      metCount: 0,
      evidence: 'I can offer you a discount on your next six months.',
    },
  ],
  [
    33,
    {
      criterionId: 'surfaced-real-reason',
      met: false,
      metCount: 0,
      evidence: 'I can offer you a discount on your next six months',
    },
  ],
  [18, { metCount: 6 }],
  [19, { metCount: 6 }],
  [21, { criterionId: 'asked-open-question', met: false, metCount: 0 }],
  [22, { metCount: 0 }],
]);

const arguments_ = process.argv.slice(2);
const live = arguments_.includes('--live');
const assertStable = arguments_.includes('--assert-stable');
const assertDistinct = arguments_.includes('--assert-distinct');
const repeatArgument = arguments_.find((argument) =>
  argument.startsWith('--repeat=')
);
const repeat = repeatArgument
  ? Number(repeatArgument.slice('--repeat='.length))
  : 1;
const numbers = arguments_
  .filter((argument) => /^\d+$/.test(argument))
  .map(Number);

if (numbers.length === 0) {
  console.error('Pass at least one persisted Attempt number.');
  process.exit(2);
}

if (!Number.isSafeInteger(repeat) || repeat < 1) {
  console.error('--repeat must be a positive integer.');
  process.exit(2);
}

function readAttempt(number: number): PersistedAttempt {
  const path = resolve(
    'data',
    'attempts',
    scenario.id,
    `${String(number).padStart(4, '0')}.json`
  );

  if (!existsSync(path)) {
    throw new Error(`Attempt ${String(number)} does not exist at ${path}.`);
  }

  return JSON.parse(readFileSync(path, 'utf8')) as PersistedAttempt;
}

function printAssessment(assessment: Assessment): void {
  for (const verdict of assessment.criteria) {
    // An absent quote is the recorded answer for a not-met criterion the
    // Attempt never reached, not a missing field.
    const evidence =
      verdict.evidence === undefined
        ? '(no qualifying Trainee moment)'
        : JSON.stringify(verdict.evidence);
    console.log(
      `  ${verdict.met ? 'MET    ' : 'NOT MET'} ${verdict.criterionId.padEnd(30)} ${evidence}`
    );
  }

  const metCount = assessment.criteria.filter(({ met }) => met).length;
  console.log(`  ${String(metCount)} of 6 criteria met`);
}

function duplicateEvidence(assessment: Assessment): string[] {
  const criterionIdsByEvidence = new Map<string, string[]>();

  for (const verdict of assessment.criteria) {
    // Two criteria that both record no qualifying moment are not reusing a
    // quote; they are both saying the Attempt never got there.
    if (verdict.evidence === undefined) {
      continue;
    }

    const criterionIds = criterionIdsByEvidence.get(verdict.evidence) ?? [];
    criterionIds.push(verdict.criterionId);
    criterionIdsByEvidence.set(verdict.evidence, criterionIds);
  }

  return [...criterionIdsByEvidence.entries()]
    .filter(([, criterionIds]) => criterionIds.length > 1)
    .map(
      ([evidence, criterionIds]) =>
        `${JSON.stringify(evidence)} (${criterionIds.join(', ')})`
    );
}

function checkKnownExpectation(
  number: number,
  assessment: Assessment
): boolean {
  const expectation = knownExpectations.get(number);

  if (!expectation) {
    return true;
  }

  if (expectation.metCount !== undefined) {
    const metCount = assessment.criteria.filter(({ met }) => met).length;
    if (metCount !== expectation.metCount) {
      console.error(
        `  BAD expected ${String(expectation.metCount)} criteria met, received ${String(metCount)}.`
      );
      return false;
    }
  }

  if (expectation.criterionId) {
    const verdict = assessment.criteria.find(
      ({ criterionId }) => criterionId === expectation.criterionId
    );
    if (!verdict || verdict.met !== expectation.met) {
      console.error(
        `  BAD expected ${expectation.criterionId} ${expectation.met ? 'MET' : 'NOT MET'}.`
      );
      return false;
    }

    if (
      expectation.evidence !== undefined &&
      verdict.evidence !== expectation.evidence
    ) {
      console.error(
        `  BAD expected ${expectation.criterionId} evidence ${JSON.stringify(expectation.evidence)}, received ${JSON.stringify(verdict.evidence)}.`
      );
      return false;
    }
  }

  return true;
}

function varyingCriteria(assessments: Assessment[]): string[] {
  return scenario.rubric
    .map(({ id }) => {
      const readings = assessments.map((assessment) => {
        const verdict = assessment.criteria.find(
          ({ criterionId }) => criterionId === id
        );
        return verdict
          ? `${verdict.met ? 'met' : 'not met'}:${verdict.evidence ?? '(no qualifying Trainee moment)'}`
          : 'missing';
      });
      return new Set(readings).size > 1 ? id : undefined;
    })
    .filter((id): id is string => id !== undefined);
}

const attempts = numbers.map(readAttempt);

if (!live) {
  for (const attempt of attempts) {
    console.log(`\n=== STORED ATTEMPT ${String(attempt.number)}`);
    printAssessment(attempt.assessment);
  }
  console.log(
    '\nDry readback only. Pass --live to send each Attempt to OpenAI for a fresh Assessment.'
  );
  process.exit(0);
}

const { openAiApiKey } = readServerEnvironment();
const assessAttempt = createOpenAiAttemptAssessor({ apiKey: openAiApiKey });
let failed = false;

for (const attempt of attempts) {
  const readings: Assessment[] = [];

  for (let reading = 1; reading <= repeat; reading += 1) {
    console.log(
      `\n=== ATTEMPT ${String(attempt.number)} — READING ${String(reading)} OF ${String(repeat)}`
    );
    const assessment = await assessAttempt(
      attempt.transcript,
      scenario.rubric,
      scenario.persona.privateProfile
    );
    readings.push(assessment);
    printAssessment(assessment);

    const duplicates = duplicateEvidence(assessment);
    if (duplicates.length > 0) {
      console.log('  DUPLICATE EVIDENCE');
      for (const duplicate of duplicates) {
        console.log(`    ${duplicate}`);
      }
      failed ||= assertDistinct;
    }

    if (!checkKnownExpectation(attempt.number, assessment)) {
      failed = true;
    }
  }

  const varying = varyingCriteria(readings);
  if (varying.length > 0) {
    console.log(`  VARIED ACROSS READINGS: ${varying.join(', ')}`);
    failed ||= assertStable;
  }
}

if (failed) {
  process.exitCode = 1;
}
