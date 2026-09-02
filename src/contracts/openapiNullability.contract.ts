import type {
  Action,
  AssertionStatus,
  EvaluatorMetricsRes,
  EvaluationOutcome,
  ExecutionErrorDetailRes,
  ExecutionOutcome,
  QualityGateMetricsRes,
  QualityGateRes,
  TargetReferenceReq,
  TargetReferenceRes,
  TestRunDetailRes,
  TestRunListItemRes,
  TestRunResultListItemRes,
} from '../services/testRunService';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;

type Assert<Condition extends true> = Condition;

// OpenAPI의 required + nullable 조합이 DTO 변경 과정에서 optional이나 non-null로 좁혀지지 않게 한다.
export type TargetReferenceContract = [
  Assert<Equal<TargetReferenceReq['model'], string>>,
  Assert<Equal<TargetReferenceRes['revision'], string | null>>,
  Assert<Equal<TargetReferenceRes['model'], string>>,
];

export type TestRunDetailNullabilityContract = [
  Assert<Equal<TestRunDetailRes['executionOutcome'], ExecutionOutcome | null>>,
  Assert<Equal<TestRunDetailRes['qualityGate'], QualityGateRes | null>>,
  Assert<Equal<TestRunDetailRes['startedAt'], string | null>>,
  Assert<Equal<TestRunDetailRes['completedAt'], string | null>>,
];

export type TestRunListNullabilityContract = [
  Assert<Equal<TestRunListItemRes['executionOutcome'], ExecutionOutcome | null>>,
  Assert<Equal<TestRunListItemRes['qualityGateStatus'], QualityGateRes['status'] | null>>,
  Assert<Equal<TestRunListItemRes['startedAt'], string | null>>,
  Assert<Equal<TestRunListItemRes['completedAt'], string | null>>,
];

export type TestRunResultNullabilityContract = [
  Assert<Equal<TestRunResultListItemRes['evaluatorVerdict'], Action | null>>,
  Assert<Equal<TestRunResultListItemRes['assertionStatus'], AssertionStatus | null>>,
  Assert<Equal<TestRunResultListItemRes['evaluationOutcome'], EvaluationOutcome | null>>,
  Assert<Equal<TestRunResultListItemRes['error'], ExecutionErrorDetailRes | null>>,
];

export type QualityGateMetricsContract = [
  Assert<Equal<QualityGateRes['metrics'], QualityGateMetricsRes | null>>,
  Assert<Equal<keyof QualityGateMetricsRes, 'assertionPassRate' | 'executionSuccessRate'>>,
  Assert<Equal<QualityGateMetricsRes['assertionPassRate'], number>>,
  Assert<Equal<QualityGateMetricsRes['executionSuccessRate'], number>>,
];

export type EvaluatorMetricsNullabilityContract = [
  Assert<Equal<EvaluatorMetricsRes['falsePositiveRate'], number | null>>,
  Assert<Equal<EvaluatorMetricsRes['falseNegativeRate'], number | null>>,
];
