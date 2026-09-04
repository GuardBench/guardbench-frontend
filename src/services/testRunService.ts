import { apiRequest } from './apiClient';

// ─── OpenAPI 계약 기준 요청/응답 DTO ─────────────────────────────

export type EvaluationCheck = 'PII_LEAKAGE' | 'HARMFUL_CONTENT';
export type EvaluationStrictness = 'RELAXED' | 'STANDARD' | 'STRICT';

export interface TargetReferenceReq {
  type: 'HTTP_ENDPOINT';
  identifier: string;
  revision?: string;
  model: string;
}

export interface TargetReferenceRes {
  type: 'HTTP_ENDPOINT';
  identifier: string;
  revision: string | null;
  model: string;
}

/**
 * Legacy 조회 응답 호환용 타입.
 * 신규 TestRun 생성 요청에서는 더 이상 사용하지 않는다.
 * Backend #173/#178 merge 후 조회 응답에서도 제거되면 함께 삭제한다.
 */
export interface EvaluationProfileReq {
  checks: EvaluationCheck[];
  strictness: EvaluationStrictness;
}

export interface CreateTestRunPayload {
  testSuiteId: number;
  target: TargetReferenceReq;
}

export interface CreateTestRunResponse {
  id: number;
  testSuiteId: number;
  status: TestRunStatus;
  testCaseCount: number;
  target: TargetReferenceRes;
  evaluationProfile?: EvaluationProfileReq;
  createdAt: string;
}

export type TestRunStatus = 'QUEUED' | 'PREPARING' | 'RUNNING' | 'FINISHED';
export type ExecutionOutcome = 'COMPLETED' | 'ERROR' | 'INCOMPLETE';
export type QualityGateStatus = 'PASS' | 'FAIL' | 'NOT_EVALUATED';

export interface TestRunProgressRes {
  processedTestCaseCount: number;
  percent: number;
}

export interface QualityGateRes {
  status: QualityGateStatus;
  metrics: QualityGateMetricsRes | null;
}

export interface QualityGateMetricsRes {
  assertionPassRate: number;
  executionSuccessRate: number;
}

export interface TestRunDetailRes {
  id: number;
  testSuiteId: number;
  status: TestRunStatus;
  testCaseCount: number;
  progress: TestRunProgressRes;
  target: TargetReferenceRes;
  evaluationProfile: EvaluationProfileReq;
  executionOutcome: ExecutionOutcome | null;
  qualityGate: QualityGateRes | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface TestRunListItemRes {
  id: number;
  testSuiteId: number;
  status: TestRunStatus;
  testCaseCount: number;
  progress: TestRunProgressRes;
  executionOutcome: ExecutionOutcome | null;
  qualityGateStatus: QualityGateStatus | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface PageMetaRes {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface TestRunListApiResponse {
  items: TestRunListItemRes[];
  page: PageMetaRes;
}

export type TestExecutionResultStatus = 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'NOT_STARTED';
export type Action = 'ALLOW' | 'BLOCK';
export type AssertionStatus = 'PASS' | 'FAIL';
export type EvaluationOutcome = 'TRUE_POSITIVE' | 'TRUE_NEGATIVE' | 'FALSE_POSITIVE' | 'FALSE_NEGATIVE';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ExecutionFailureStage = 'APPLICATION_TARGET' | 'EVALUATOR';

export interface ExecutionErrorDetailRes {
  stage: ExecutionFailureStage;
  code: string;
  message: string;
}

export interface TestRunResultListItemRes {
  testCaseSnapshotId: number;
  name: string;
  input: string;
  expectedAction: Action;
  severity: Severity;
  category: string;
  executionStatus: TestExecutionResultStatus;
  evaluatorVerdict: Action | null;
  assertionStatus: AssertionStatus | null;
  evaluationOutcome: EvaluationOutcome | null;
  error: ExecutionErrorDetailRes | null;
}

export interface TestRunResultListApiResponse {
  items: TestRunResultListItemRes[];
  page: PageMetaRes;
}

export interface EvaluatorMetricsRes {
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
}

export async function createTestRun(
  payload: CreateTestRunPayload,
  idempotencyKey?: string,
): Promise<CreateTestRunResponse> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return apiRequest<CreateTestRunResponse>('/test-runs', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  });
}

export async function listTestRuns(params?: {
  page?: number;
  size?: number;
  testSuiteId?: number;
  status?: TestRunStatus | TestRunStatus[];
}): Promise<TestRunListApiResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.size) query.append('size', params.size.toString());
  if (params?.testSuiteId) query.append('testSuiteId', params.testSuiteId.toString());
  if (params?.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((s) => query.append('status', s));
  }
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<TestRunListApiResponse>(`/test-runs${queryString}`);
}

export async function getTestRunDetail(
  testRunId: number | string,
  signal?: AbortSignal,
): Promise<TestRunDetailRes> {
  return apiRequest<TestRunDetailRes>(`/test-runs/${testRunId}`, { signal });
}

export async function getTestRunResults(
  testRunId: number | string,
  params?: { page?: number; size?: number; evaluationOutcome?: EvaluationOutcome },
): Promise<TestRunResultListApiResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.size) query.append('size', params.size.toString());
  if (params?.evaluationOutcome) query.append('evaluationOutcome', params.evaluationOutcome);
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<TestRunResultListApiResponse>(`/test-runs/${testRunId}/results${queryString}`);
}

export async function getTestRunEvaluatorMetrics(
  testRunId: number | string,
): Promise<EvaluatorMetricsRes> {
  return apiRequest<EvaluatorMetricsRes>(`/test-runs/${testRunId}/evaluator-metrics`);
}
