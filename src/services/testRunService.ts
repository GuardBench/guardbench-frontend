import { apiRequest } from './apiClient';
import type { TestRun, ExecutionDetail } from '../types';

// 1. 테스트 실행 생성 요청 Payload 타입
export interface CreateTestRunPayload {
  suiteId: string;
  baselineGuardrailId: string;
  baselineGuardrailVersion: string;
  candidateGuardrailId: string;
  candidateGuardrailVersion: string;
}

// 2. 테스트 실행 생성 응답 타입
export interface CreateTestRunResponse {
  runId: string;
  executionStatus: string;
}

// 3. 테스트 실행 진행 상태 조회 응답 타입
export interface TestRunProgressResponse {
  runId: string;
  executionStatus: 'QUEUED' | 'RUNNING' | 'FINISHED' | 'FAILED';
  executedSnapshots: number;
  totalSnapshots: number;
  qualityGateStatus?: string;
}

// 4. 테스트 실행 결과 조회 응답 타입
export interface TestRunResultsResponse {
  run: TestRun;
  executionDetails: ExecutionDetail[];
}

// 5. TestRun 목록 조회 응답 타입 (Pagination)
export interface TestRunListApiResponse {
  items: TestRun[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

/**
 * 1) 신규 테스트 Run 실행 요청 (POST /test-runs)
 */
export async function createTestRun(
  payload: CreateTestRunPayload
): Promise<CreateTestRunResponse> {
  return apiRequest<CreateTestRunResponse>('/test-runs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 2) TestRun 목록 조회 (GET /test-runs)
 */
export async function listTestRuns(params?: {
  page?: number;
  size?: number;
  status?: string;
}): Promise<TestRunListApiResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.size) query.append('size', params.size.toString());
  if (params?.status) query.append('status', params.status);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<TestRunListApiResponse>(`/test-runs${queryString}`);
}

/**
 * 3) 테스트 Run 진행 상태 조회 (GET /test-runs/{runId})
 */
export async function getTestRunProgress(
  runId: string
): Promise<TestRunProgressResponse> {
  return apiRequest<TestRunProgressResponse>(`/test-runs/${runId}`);
}

/**
 * 4) 테스트 Run 실행 결과 및 스냅샷 목록 조회 (GET /test-runs/{runId}/results)
 */
export async function getTestRunResults(
  runId: string
): Promise<TestRunResultsResponse> {
  return apiRequest<TestRunResultsResponse>(`/test-runs/${runId}/results`);
}
