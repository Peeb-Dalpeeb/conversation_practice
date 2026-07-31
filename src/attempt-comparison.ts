import type { RubricCriterion } from './scenario.js';
import type { Attempt } from './server/attempt-store.js';

export type ComparisonOutcome = {
  met: boolean;
  evidence: string;
};

export type AttemptComparison =
  | { status: 'not-enough-attempts' }
  | {
      status: 'ready';
      columns: ['Previous attempt', 'This attempt'];
      criteria: {
        criterionId: string;
        description: string;
        outcomes: [ComparisonOutcome, ComparisonOutcome];
      }[];
    };

function outcomeForCriterion(
  attempt: Attempt,
  criterionId: string
): ComparisonOutcome {
  const outcome = attempt.assessment.criteria.find(
    (criterion) => criterion.criterionId === criterionId
  );

  if (!outcome) {
    throw new TypeError(
      `Attempt ${String(attempt.number)} has no Assessment for ${criterionId}.`
    );
  }

  return { met: outcome.met, evidence: outcome.evidence };
}

export function createAttemptComparison(
  rubric: readonly RubricCriterion[],
  attempts: readonly Attempt[]
): AttemptComparison {
  if (attempts.length < 2) {
    return { status: 'not-enough-attempts' };
  }

  const [previousAttempt, thisAttempt] = attempts.slice(-2) as [
    Attempt,
    Attempt,
  ];

  return {
    status: 'ready',
    columns: ['Previous attempt', 'This attempt'],
    criteria: rubric.map((criterion) => ({
      criterionId: criterion.id,
      description: criterion.description,
      outcomes: [
        outcomeForCriterion(previousAttempt, criterion.id),
        outcomeForCriterion(thisAttempt, criterion.id),
      ],
    })),
  };
}
