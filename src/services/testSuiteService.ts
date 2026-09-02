import { apiRequest } from './apiClient';

// 1. TestSuite 생성 요청
export interface CreateTestSuitePayload {
  name: string;
  description?: string | null;
  testCases?: Array<{
    name: string;
    input: string;
    expectedAction: 'ALLOW' | 'BLOCK';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
  }>;
}

// 2. TestSuite 목록 조회 응답 (Pagination)
export interface TestSuiteListApiResponse {
  items: Array<{
    id: number | string;
    name: string;
    description?: string;
    testCaseCount: number;
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
 * TestSuite 목록 조회 (GET /test-suites)
 */
export async function getTestSuites(params?: {
  page?: number;
  size?: number;
  name?: string;
}): Promise<TestSuiteListApiResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.size) query.append('size', params.size.toString());
  if (params?.name) query.append('name', params.name);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<TestSuiteListApiResponse>(`/test-suites${queryString}`);
}

/**
 * TestSuite 상세 조회 (GET /test-suites/{suiteId})
 */
export async function getTestSuite(suiteId: string | number): Promise<any> {
  return apiRequest<any>(`/test-suites/${suiteId}`);
}

/**
 * TestSuite 생성 (POST /test-suites)
 */
export async function createTestSuite(payload: CreateTestSuitePayload): Promise<any> {
  return apiRequest<any>('/test-suites', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * TestSuite 수정 (PATCH /test-suites/{suiteId})
 */
export async function updateTestSuite(
  suiteId: string | number,
  payload: { name?: string; description?: string }
): Promise<any> {
  return apiRequest<any>(`/test-suites/${suiteId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
