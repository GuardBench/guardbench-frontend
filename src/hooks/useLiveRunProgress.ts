import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/apiClient';
import { getTestRunDetail, type TestRunDetailRes } from '../services/testRunService';

export type PollingState = 'IDLE' | 'IN_FLIGHT' | 'SCHEDULED' | 'TRANSIENT_ERROR' | 'TERMINAL_ERROR' | 'FINISHED';

interface UseLiveRunProgressOptions {
  runId: string | null;
  pollIntervalMs?: number;
  onFinished?: (detail: TestRunDetailRes) => void;
}

const isTerminalError = (error: unknown) => error instanceof ApiError
  && error.httpStatus >= 400
  && error.httpStatus < 500
  && error.httpStatus !== 408
  && error.httpStatus !== 429;

export function useLiveRunProgress({
  runId,
  pollIntervalMs = 3000,
  onFinished,
}: UseLiveRunProgressOptions) {
  const [detail, setDetail] = useState<TestRunDetailRes | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pollingState, setPollingState] = useState<PollingState>('IDLE');
  const [stale, setStale] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);
  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    if (!runId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const schedule = () => {
      if (!active) return;
      setPollingState('SCHEDULED');
      const delay = typeof document !== 'undefined' && document.hidden
        ? Math.max(pollIntervalMs, 10_000)
        : pollIntervalMs;
      timer = setTimeout(fetchNext, delay);
    };

    const fetchNext = async () => {
      if (!active) return;
      controller = new AbortController();
      setPollingState('IN_FLIGHT');
      try {
        const nextDetail = await getTestRunDetail(runId, controller.signal);
        if (!active) return;
        setDetail(nextDetail);
        setError(null);
        setStale(false);
        if (nextDetail.status === 'FINISHED') {
          setPollingState('FINISHED');
          onFinishedRef.current?.(nextDetail);
          return;
        }
        schedule();
      } catch (nextError) {
        if (!active || controller.signal.aborted) return;
        setError(nextError);
        if (isTerminalError(nextError)) {
          setPollingState('TERMINAL_ERROR');
          return;
        }
        setStale(true);
        setPollingState('TRANSIENT_ERROR');
        schedule();
      }
    };

    fetchNext();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, [runId, pollIntervalMs, refreshToken]);

  return {
    detail,
    error,
    stale,
    pollingState,
    isLoading: detail === null && pollingState === 'IN_FLIGHT',
    isPolling: pollingState === 'IN_FLIGHT' || pollingState === 'SCHEDULED' || pollingState === 'TRANSIENT_ERROR',
    refresh,
  };
}
