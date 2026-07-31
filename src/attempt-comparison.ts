import type { RubricCriterion } from './scenario.js';
import type { ComparisonAttempt } from './server/attempt-store.js';

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
  attempt: ComparisonAttempt,
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
  attempts: readonly ComparisonAttempt[]
): AttemptComparison {
  const rubricCriterionIds = new Set(rubric.map(({ id }) => id));
  const comparableAttempts = [...attempts]
    .filter((attempt) => {
      const assessmentCriterionIds = new Set(
        attempt.assessment.criteria.map(({ criterionId }) => criterionId)
      );

      return (
        rubricCriterionIds.size === assessmentCriterionIds.size &&
        [...rubricCriterionIds].every((criterionId) =>
          assessmentCriterionIds.has(criterionId)
        )
      );
    })
    .sort((left, right) => left.number - right.number)
    .slice(-2);

  if (comparableAttempts.length < 2) {
    return { status: 'not-enough-attempts' };
  }

  const [previousAttempt, thisAttempt] = comparableAttempts as [
    ComparisonAttempt,
    ComparisonAttempt,
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
