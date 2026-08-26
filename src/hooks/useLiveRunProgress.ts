import { useState, useEffect, useRef } from 'react';
import { getTestRunDetail, type TestRunDetailRes } from '../services/testRunService';

interface UseLiveRunProgressOptions {
  runId: string | null;
  pollIntervalMs?: number;
  onFinished?: (detail: TestRunDetailRes) => void;
  onError?: (error: Error) => void;
}

/**
 * TestRun 상세(GET /test-runs/{id})를 주기적으로 polling해서
 * 진행률과 완료 상태를 추적하는 훅입니다.
 *
 * OpenAPI 계약: 어떤 상태에서든 200 OK를 반환합니다.
 * status === 'FINISHED'이면 polling을 중단합니다.
 */
export function useLiveRunProgress({
  runId,
  pollIntervalMs = 3000,
  onFinished,
  onError,
}: UseLiveRunProgressOptions) {
  const [detail, setDetail] = useState<TestRunDetailRes | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // 최신 콜백 함수 참조 보존 (useEffect 의존성 배열 타이머 재시작 방지)
  const onFinishedRef = useRef(onFinished);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onFinishedRef.current = onFinished;
    onErrorRef.current = onError;
  }, [onFinished, onError]);

  useEffect(() => {
    // runId가 없으면 Polling 수행 안 함
    if (!runId) {
      setDetail(null);
      setIsPolling(false);
      return;
    }

    let isMounted = true;
    let shouldPoll = true;
    setIsLoading(true);
    setIsPolling(true);

    const fetchDetail = async () => {
      try {
        const data = await getTestRunDetail(runId);
        if (!isMounted) return;

        setDetail(data);
        setIsLoading(false);

        // 실행 종료 조건: status === 'FINISHED'
        if (data.status === 'FINISHED') {
          shouldPoll = false;
          setIsPolling(false);
          if (onFinishedRef.current) {
            onFinishedRef.current(data);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setIsLoading(false);
        shouldPoll = false;
        setIsPolling(false);
        const error = err instanceof Error ? err : new Error('Progress 조회 오류');
        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      }
    };

    // 1) 즉시 최초 1회 호출
    fetchDetail();

    // 2) pollIntervalMs 주기마다 Polling 실행
    const timerId = setInterval(() => {
      if (shouldPoll) {
        fetchDetail();
      }
    }, pollIntervalMs);

    // Cleanup: 컴포넌트 언마운트 또는 runId 변경 시 타이머 해제 (메모리 누수 방지)
    return () => {
      isMounted = false;
      shouldPoll = false;
      clearInterval(timerId);
    };
  }, [runId, pollIntervalMs]);

  return {
    detail,
    isLoading,
    isPolling,
  };
}
