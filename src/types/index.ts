export type ViewType = 'dashboard' | 'suites' | 'new-run' | 'runs' | 'result' | 'architecture';

export type QualityGateStatus = 'PASS' | 'FAIL' | 'NOT_EVALUATED';
export type ExecutionStatus = 'COMPLETED' | 'RUNNING' | 'INCOMPLETE' | 'FAILED';
export type SuiteStatus = '활성' | '검토 필요' | '초안';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ActionType = 'BLOCK' | 'ALLOW';
export type ChangeType = 'SECURITY REGRESSION' | 'IMPROVEMENT' | 'USABILITY REGRESSION' | 'NO CHANGE';

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
  status: 'PASS' | 'FAIL' | 'RUNNING' | 'INFO';
  timeText?: string;
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
}

export interface TestRun {
  id: string;
  suiteName: string;
  snapshotsText: string;
  executionStatus: ExecutionStatus;
  qualityGateStatus: QualityGateStatus;
  versionChange: string;
  createdAt: string;
}

export interface ExecutionDetail {
  action: ActionType;
  rawResponse: string;
  filterReason?: string;
  latencyMs: number;
}

export interface SnapshotCase {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  expected: ActionType;
  baseline: ActionType;
  candidate: ActionType;
  assertion: 'PASS' | 'FAIL';
  change: ChangeType;
  inputPrompt?: string;
  baselineExecution?: ExecutionDetail;
  candidateExecution?: ExecutionDetail;
}

export interface ArchitectureRule {
  number: string;
  title: string;
  description: string;
}
