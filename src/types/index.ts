export type ViewType = 'dashboard' | 'suites' | 'new-run' | 'runs' | 'result' | 'architecture';

// P1. 세 축 분리 상태 타입
export type ProgressState = 'QUEUED' | 'PREPARING' | 'RUNNING' | 'FINISHED';
export type ExecutionResultState = 'COMPLETED' | 'INCOMPLETE' | 'FAILED' | null;
export type QualityGateState = 'NOT_EVALUATED_BEFORE_FINISH' | 'PASS' | 'FAIL' | 'NOT_EVALUATED';

export type SuiteStatus = '활성' | '검토 필요' | '초안';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// P1. Snapshot Target 상태 (ALLOW / BLOCK / 실패 / 시간 초과 / 미시작)
export type TargetStatus = 'ALLOW' | 'BLOCK' | 'FAILED' | 'TIMEOUT' | 'NOT_STARTED';

// P1. Assertion / Change 상태
export type AssertionStatus = 'PASS' | 'FAIL' | 'NONE'; // NONE = 생성 안 됨
export type ChangeStatus =
  | 'SECURITY_REGRESSION'
  | 'IMPROVEMENT'
  | 'USABILITY_REGRESSION'
  | 'NO_CHANGE'
  | 'NONE' // NONE = 생성 안 됨
  | 'NOT_COMPARABLE'; // NOT_COMPARABLE = 비교 불가

export interface StatItem {
  label: string;
  value: string | number;
  note: string;
  deltaUp?: boolean;
  color?: string;
  tintBg?: string;
}

export interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  progressState: ProgressState;
  executionResultState?: ExecutionResultState;
  qualityGateState?: QualityGateState;
  timeText?: string;
}

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedAction: 'ALLOW' | 'BLOCK';
  severity: Severity;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  caseCount: number;
  passRate: string;
  lastRun: string;
  status: SuiteStatus;
  icon: string;
  tintBg: string;
  testCases?: TestCase[];
}

export interface RunProgress {
  totalSnapshots: number;
  executedSnapshots: number;
  percentage: number;
  currentTestCaseName?: string;
}

export interface TestRun {
  id: string;
  suiteName: string;
  snapshotsText: string;
  progressState: ProgressState;
  executionResultState: ExecutionResultState;
  qualityGateState: QualityGateState;
  versionChange: string;
  createdAt: string;
  progress?: RunProgress;
}

export interface ExecutionDetail {
  status: TargetStatus;
  rawResponse?: string;
  filterReason?: string;
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
}

export interface SnapshotCase {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  expected: 'ALLOW' | 'BLOCK';
  baseline: ExecutionDetail;
  candidate: ExecutionDetail;
  assertion: AssertionStatus;
  change: ChangeStatus;
  inputPrompt?: string;
}

export interface ArchitectureRule {
  number: string;
  title: string;
  description: string;
}
