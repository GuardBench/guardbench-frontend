import { apiRequest } from './apiClient';

// ─── OpenAPI 계약 기준 요청/응답 DTO ─────────────────────────────

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

export interface QualityGatePolicyReq {
  assertionPassRateThreshold: number;
  executionSuccessRateThreshold: number;
}

export interface CreateTestRunPayload {
  testSuiteId: number;
  target: TargetReferenceReq;
  qualityGatePolicy?: QualityGatePolicyReq;
}

export interface CreateTestRunResponse {
  id: number;
  testSuiteId: number;
  status: TestRunStatus;
  testCaseCount: number;
  target: TargetReferenceRes;
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
  /** @deprecated assertion.value를 사용합니다. */
  assertionPassRate: number;
  /** @deprecated execution.value를 사용합니다. */
  executionSuccessRate: number;
  assertion: QualityGateMetricRes;
  execution: QualityGateMetricRes;
}

export interface QualityGateMetricRes {
  value: number;
  threshold: number;
  passed: boolean;
}

export interface TestRunDetailRes {
  id: number;
  testSuiteId: number;
  status: TestRunStatus;
  testCaseCount: number;
  progress: TestRunProgressRes;
  target: TargetReferenceRes;
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
export type TestRunResultAttentionType =
  | 'FALSE_NEGATIVE'
  | 'FALSE_POSITIVE'
  | 'EXECUTION_FAILED'
  | 'TIMED_OUT'
  | 'NOT_STARTED';
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
  attentionType: TestRunResultAttentionType | null;
  error: ExecutionErrorDetailRes | null;
}

export interface TestRunResultAttentionTypeCountsRes {
  FALSE_NEGATIVE: number;
  FALSE_POSITIVE: number;
  EXECUTION_FAILED: number;
  TIMED_OUT: number;
  NOT_STARTED: number;
}

export interface TestRunResultFacetsRes {
  allResults: number;
  attentionTotal: number;
  attentionTypes: TestRunResultAttentionTypeCountsRes;
}

export interface TestRunResultListApiResponse {
  items: TestRunResultListItemRes[];
  page: PageMetaRes;
  facets?: TestRunResultFacetsRes | null;
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
  params?: {
    page?: number;
    size?: number;
    name?: string;
    input?: string;
    category?: string;
    expectedAction?: Action;
    severity?: Severity;
    executionStatus?: TestExecutionResultStatus;
    assertionStatus?: AssertionStatus;
    evaluationOutcome?: EvaluationOutcome;
    sort?: string[];
    attentionType?: TestRunResultAttentionType[];
    includeFacets?: 'attention';
  },
): Promise<TestRunResultListApiResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.size) query.append('size', params.size.toString());
  if (params?.name) query.append('name', params.name);
  if (params?.input) query.append('input', params.input);
  if (params?.category) query.append('category', params.category);
  if (params?.expectedAction) query.append('expectedAction', params.expectedAction);
  if (params?.severity) query.append('severity', params.severity);
  if (params?.executionStatus) query.append('executionStatus', params.executionStatus);
  if (params?.assertionStatus) query.append('assertionStatus', params.assertionStatus);
  if (params?.evaluationOutcome) query.append('evaluationOutcome', params.evaluationOutcome);
  params?.sort?.forEach((sort) => query.append('sort', sort));
  params?.attentionType?.forEach((type) => query.append('attentionType', type));
  if (params?.includeFacets) query.append('includeFacets', params.includeFacets);
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<TestRunResultListApiResponse>(`/test-runs/${testRunId}/results${queryString}`);
}

export async function getTestRunEvaluatorMetrics(
  testRunId: number | string,
): Promise<EvaluatorMetricsRes> {
  return apiRequest<EvaluatorMetricsRes>(`/test-runs/${testRunId}/evaluator-metrics`);
}
