import { useState, useEffect, useRef } from 'react';
import { getTestRunProgress, type TestRunProgressResponse } from '../services/testRunService';

interface UseLiveRunProgressOptions {
  runId: string | null;
  pollIntervalMs?: number;
  onFinished?: (finalProgress: TestRunProgressResponse) => void;
  onError?: (error: Error) => void;
}

export function useLiveRunProgress({
  runId,
  pollIntervalMs = 2000,
  onFinished,
  onError,
}: UseLiveRunProgressOptions) {
  const [progress, setProgress] = useState<TestRunProgressResponse | null>(null);
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
      setProgress(null);
      setIsPolling(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setIsPolling(true);

    const fetchProgress = async () => {
      try {
        const data = await getTestRunProgress(runId);
        if (!isMounted) return;

        setProgress(data);
        setIsLoading(false);

        // 실행 종료 조건 (FINISHED 또는 FAILED)
        if (data.executionStatus === 'FINISHED' || data.executionStatus === 'FAILED') {
          setIsPolling(false);
          if (onFinishedRef.current) {
            onFinishedRef.current(data);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setIsLoading(false);
        setIsPolling(false);
        const error = err instanceof Error ? err : new Error('Progress 조회 오류');
        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      }
    };

    // 1) 즉시 최초 1회 호출
    fetchProgress();

    // 2) pollIntervalMs 주기마다 Polling 실행
    const timerId = setInterval(() => {
      if (isPolling) {
        fetchProgress();
      }
    }, pollIntervalMs);

    // Cleanup: 컴포넌트 언마운트 또는 runId 변경 시 타이머 해제 (메모리 누수 방지!)
    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, [runId, pollIntervalMs, isPolling]);

  return {
    progress,
    isLoading,
    isPolling,
  };
}
