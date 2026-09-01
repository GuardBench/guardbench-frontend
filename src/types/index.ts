export type ViewType = 'dashboard' | 'suites' | 'new-run' | 'runs' | 'result' | 'architecture';

// P1. 세 축 분리 상태 타입
export type ProgressState = 'QUEUED' | 'PREPARING' | 'RUNNING' | 'FINISHED';
export type ExecutionResultState = 'COMPLETED' | 'INCOMPLETE' | 'ERROR' | null;
export type QualityGateState = 'NOT_EVALUATED_BEFORE_FINISH' | 'PASS' | 'FAIL' | 'NOT_EVALUATED';

export type SuiteStatus = '활성' | '검토 필요' | '초안';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// P1. Assertion 상태
export type AssertionStatus = 'PASS' | 'FAIL' | 'NONE'; // NONE = 생성 안 됨

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

export interface ArchitectureRule {
  number: string;
  title: string;
  description: string;
}
