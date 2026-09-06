import { apiRequest } from './apiClient';

// TestCase 생성 Payload
export interface CreateTestCasePayload {
  name: string;
  input: string;
  expectedAction: 'ALLOW' | 'BLOCK';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

export interface BulkCreateTestCasesResponse {
  createdTestCaseIds: Array<number | string>;
  createdCount: number;
  totalTestCaseCount: number;
}

// TestCase 목록 Response
export interface TestCaseListApiResponse {
  items: Array<{
    id: number | string;
    testSuiteId?: number | string;
    name: string;
    input: string;
    expectedAction: 'ALLOW' | 'BLOCK';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    createdAt: string;
    updatedAt: string;
  }>;
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

/**
 * 특정 TestSuite 내 TestCase 목록 조회 (GET /test-suites/{suiteId}/test-cases)
 */
export async function getTestCases(
  suiteId: string | number,
  params?: { page?: number; size?: number; name?: string; category?: string }
): Promise<TestCaseListApiResponse> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.append('page', params.page.toString());
  if (params?.size !== undefined) query.append('size', params.size.toString());
  if (params?.name) query.append('name', params.name);
  if (params?.category) query.append('category', params.category);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<TestCaseListApiResponse>(
    `/test-suites/${suiteId}/test-cases${queryString}`
  );
}

/**
 * TestCase 생성 (POST /test-suites/{suiteId}/test-cases)
 */
export async function createTestCase(
  suiteId: string | number,
  payload: CreateTestCasePayload
): Promise<any> {
  return apiRequest<any>(`/test-suites/${suiteId}/test-cases`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * TestCase 일괄 생성 (POST /test-suites/{suiteId}/test-cases/bulk)
 *
 * 같은 논리 요청을 재시도할 때는 동일한 idempotencyKey를 전달해야 한다.
 */
export async function createTestCasesBulk(
  suiteId: string | number,
  items: CreateTestCasePayload[],
  idempotencyKey: string,
): Promise<BulkCreateTestCasesResponse> {
  return apiRequest<BulkCreateTestCasesResponse>(`/test-suites/${suiteId}/test-cases/bulk`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ items }),
  });
}

/**
 * TestCase 상세 조회 (GET /test-cases/{testCaseId})
 */
export async function getTestCase(testCaseId: string | number): Promise<any> {
  return apiRequest<any>(`/test-cases/${testCaseId}`);
}

/**
 * TestCase 부분 수정 (PATCH /test-cases/{testCaseId})
 */
export async function updateTestCase(
  testCaseId: string | number,
  payload: Partial<CreateTestCasePayload>
): Promise<any> {
  return apiRequest<any>(`/test-cases/${testCaseId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * TestCase 논리 삭제 (DELETE /test-cases/{testCaseId})
 */
export async function deleteTestCase(testCaseId: string | number): Promise<void> {
  const url = `/test-cases/${testCaseId}`;
  return apiRequest<void>(url, {
    method: 'DELETE',
  });
}
