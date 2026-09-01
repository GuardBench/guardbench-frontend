import type {
  Action,
  AssertionStatus,
  EvaluationOutcome,
  ExecutionErrorDetailRes,
  ExecutionOutcome,
  QualityGateRes,
  TestRunDetailRes,
  TestRunResultListItemRes,
} from '../services/testRunService';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;

type Assert<Condition extends true> = Condition;

// OpenAPI의 required + nullable 조합이 DTO 변경 과정에서 optional이나 non-null로 좁혀지지 않게 한다.
export type TestRunDetailNullabilityContract = [
  Assert<Equal<TestRunDetailRes['executionOutcome'], ExecutionOutcome | null>>,
  Assert<Equal<TestRunDetailRes['qualityGate'], QualityGateRes | null>>,
  Assert<Equal<TestRunDetailRes['startedAt'], string | null>>,
  Assert<Equal<TestRunDetailRes['completedAt'], string | null>>,
];

export type TestRunResultNullabilityContract = [
  Assert<Equal<TestRunResultListItemRes['evaluatorVerdict'], Action | null>>,
  Assert<Equal<TestRunResultListItemRes['assertionStatus'], AssertionStatus | null>>,
  Assert<Equal<TestRunResultListItemRes['evaluationOutcome'], EvaluationOutcome | null>>,
  Assert<Equal<TestRunResultListItemRes['error'], ExecutionErrorDetailRes | null>>,
];

export type QualityGateMetricsNullabilityContract = Assert<
  Equal<QualityGateRes['metrics'], Record<string, unknown> | null>
>;
