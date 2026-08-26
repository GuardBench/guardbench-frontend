import { apiRequest } from './apiClient';

// ─── OpenAPI 계약 기준 요청/응답 DTO ─────────────────────────────

// POST /test-runs  요청 (TestRunCreateReq)
export interface BaselineTargetReq {
  guardrailId: string;
  version: string; // numbered version만 허용 (^[0-9]+$, DRAFT 불허)
}

export interface CandidateTargetReq {
  guardrailId: string;
  source: 'DRAFT'; // MVP에서는 DRAFT만 허용
}

export interface CreateTestRunPayload {
  testSuiteId: number;
  baseline: BaselineTargetReq;
  candidate: CandidateTargetReq;
}

// POST /test-runs  응답 (TestRunCreateRes)
export interface CreateTestRunResponse {
  id: number;
  testSuiteId: number;
  status: TestRunStatus;
  testCaseCount: number;
  createdAt: string;
}

// ─── 공통 열거형 ─────────────────────────────────────────────────

export type TestRunStatus = 'QUEUED' | 'PREPARING' | 'RUNNING' | 'FINISHED';
export type ExecutionOutcome = 'COMPLETED' | 'ERROR' | 'INCOMPLETE';
export type QualityGateStatus = 'PASS' | 'FAIL' | 'NOT_EVALUATED';

// ─── GET /test-runs/{id}  상세 (TestRunDetailRes) ────────────────

export interface TestRunProgressRes {
  processedTestCaseCount: number;
  percent: number; // 0 ~ 100
}

export interface BaselineExecutionTargetRes {
  guardrailId: string;
  version: string;
}

export interface CandidateExecutionTargetRes {
  guardrailId: string;
  requestedSource: 'DRAFT';
  resolvedVersion: string | null;
}

export interface TestRunTargetsRes {
  baseline: BaselineExecutionTargetRes;
  candidate: CandidateExecutionTargetRes;
}

export interface QualityGateMetricsRes {
  candidateAssertionPassRate: number;
  securityRegressionCount: number;
  securityRegressionRate: number;
  usabilityRegressionRate: number;
  testExecutionSuccessRate: number;
}

export interface QualityGateRes {
  status: QualityGateStatus;
  metrics: QualityGateMetricsRes | null;
}

export interface TestRunDetailRes {
  id: number;
  testSuiteId: number;
  status: TestRunStatus;
  testCaseCount: number;
  progress: TestRunProgressRes;
  targets: TestRunTargetsRes;
  executionOutcome: ExecutionOutcome | null;
  qualityGate: QualityGateRes | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

// ─── GET /test-runs  목록 (TestRunListRes) ───────────────────────

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

// ─── GET /test-runs/{id}/results  결과 목록 (TestRunResultListRes)

export type TestExecutionResultStatus = 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'NOT_STARTED';
export type Action = 'ALLOW' | 'BLOCK';
export type AssertionStatus = 'PASS' | 'FAIL';
export type ComparabilityStatus = 'COMPARABLE' | 'NOT_COMPARABLE';
export type ChangeType = 'NO_CHANGE' | 'SECURITY_REGRESSION' | 'USABILITY_REGRESSION' | 'IMPROVEMENT' | 'POLICY_BEHAVIOR_CHANGED';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExecutionErrorDetailRes {
  code: string;
  message: string;
}

export interface TestExecutionResultRes {
  status: TestExecutionResultStatus;
  actualAction: Action | null;
  error: ExecutionErrorDetailRes | null;
}

export interface TestRunResultListItemRes {
  snapshotId: number;
  testCaseId: number;
  name: string;
  input: string;
  expectedAction: Action;
  severity: Severity;
  category: string;
  baselineExecution: TestExecutionResultRes;
  candidateExecution: TestExecutionResultRes;
  assertionStatus: AssertionStatus | null;
  comparabilityStatus: ComparabilityStatus | null;
  changeType: ChangeType | null;
}

export interface TestRunResultListApiResponse {
  items: TestRunResultListItemRes[];
  page: PageMetaRes;
}

// ─── API 호출 함수 ───────────────────────────────────────────────

/**
 * 1) 신규 TestRun 실행 요청 (POST /test-runs)
 * 202 Accepted를 반환합니다.
 */
export async function createTestRun(
  payload: CreateTestRunPayload,
  idempotencyKey?: string,
): Promise<CreateTestRunResponse> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return apiRequest<CreateTestRunResponse>('/test-runs', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  });
}

/**
 * 2) TestRun 목록 조회 (GET /test-runs)
 */
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

/**
 * 3) TestRun 상세 조회 — Polling용 (GET /test-runs/{testRunId})
 * 어떤 상태에서든 200 OK를 반환합니다.
 */
export async function getTestRunDetail(
  testRunId: number | string,
): Promise<TestRunDetailRes> {
  return apiRequest<TestRunDetailRes>(`/test-runs/${testRunId}`);
}

/**
 * 4) TestRun 결과 목록 조회 (GET /test-runs/{testRunId}/results)
 * FINISHED 상태에서만 200 OK를 반환합니다. 그 전에는 409 TEST_RUN_NOT_FINISHED입니다.
 */
export async function getTestRunResults(
  testRunId: number | string,
  params?: { page?: number; size?: number },
): Promise<TestRunResultListApiResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.size) query.append('size', params.size.toString());

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<TestRunResultListApiResponse>(`/test-runs/${testRunId}/results${queryString}`);
}
