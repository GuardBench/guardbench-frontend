// 백엔드 공통 API Response Envelope 타입 정의
export interface ApiResponseEnvelope<T> {
  httpStatus: number;
  message: string;
  data: T;
}

// 백엔드 API 기본 URL (개발 환경 proxy 또는 환경변수)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * 백엔드 REST API를 호출하고 Envelope를 자동으로 언래핑(Unwrap)해주는 공통 fetch 함수
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
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

  const json: ApiResponseEnvelope<T> = await response.json();

  if (!response.ok || json.httpStatus >= 400) {
    throw new Error(json.message || `API 요청 실패 (HTTP ${response.status})`);
  }

  return json.data;
}
