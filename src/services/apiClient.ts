// 백엔드 공통 API Response Envelope 타입 정의
export interface ApiResponseEnvelope<T> {
  httpStatus: number;
  message: string;
  data: T;
}

/**
 * 백엔드 에러 응답의 data 필드 구조.
 * OpenAPI ErrorDetail: { code: string }
 * OpenAPI ValidationErrorDetail: { code: "VALIDATION_ERROR", errors: FieldErrorDetail[] }
 */
export interface ApiErrorData {
  code: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * API 호출 실패 시 throw되는 구조화된 에러.
 * catch 블록에서 error.code로 에러 종류를 분기할 수 있습니다.
 * 예) TEST_RUN_NOT_FINISHED, TEST_SUITE_NOT_FOUND, VALIDATION_ERROR 등
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly code: string,
    public readonly fieldErrors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 백엔드 API 기본 URL (개발 환경 proxy 또는 환경변수)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * 백엔드 REST API를 호출하고 Envelope를 자동으로 언래핑(Unwrap)해주는 공통 fetch 함수.
 *
 * - 204 No Content: body가 없으므로 JSON 파싱을 건너뛰고 undefined를 반환합니다.
 * - 에러 응답: 서버의 ErrorDetail.code를 포함한 ApiError를 throw합니다.
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  });

  // 204 No Content — 삭제 성공 등 body가 없는 정상 응답
  if (response.status === 204) {
    return undefined as T;
  }

  const json: ApiResponseEnvelope<T> = await response.json();

  if (!response.ok || json.httpStatus >= 400) {
    // 서버가 ErrorDetail 또는 ValidationErrorDetail을 반환한 경우 구조화
    const errorData = json.data as unknown as ApiErrorData | undefined;
    throw new ApiError(
      json.message || `API 요청 실패 (HTTP ${response.status})`,
      response.status,
      errorData?.code || 'UNKNOWN_ERROR',
      errorData?.errors,
    );
  }

  return json.data;
}
