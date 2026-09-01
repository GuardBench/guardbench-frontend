import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/apiClient';
import { getTestRunDetail, type TestRunDetailRes } from '../services/testRunService';

export type PollingState = 'IDLE' | 'IN_FLIGHT' | 'SCHEDULED' | 'TRANSIENT_ERROR' | 'TERMINAL_ERROR' | 'FINISHED';

interface UseLiveRunProgressOptions {
  runId: string | null;
  pollIntervalMs?: number;
}

const MAX_TRANSIENT_FAILURES = 5;

const isTerminalError = (error: unknown) => error instanceof ApiError
  && (error.code === 'INVALID_RESPONSE'
    || (error.httpStatus >= 400
      && error.httpStatus < 500
      && error.httpStatus !== 408
      && error.httpStatus !== 429));

export function useLiveRunProgress({
  runId,
  pollIntervalMs = 3000,
}: UseLiveRunProgressOptions) {
  const [detail, setDetail] = useState<TestRunDetailRes | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pollingState, setPollingState] = useState<PollingState>('IDLE');
  const [stale, setStale] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    if (!runId || typeof document === 'undefined') return;
    let active = true;
    // visibility handler가 최신 종료 상태를 읽도록 effect 지역 변수로 관리한다.
    let pollingStopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let inFlight = false;
    let transientFailures = 0;

    const schedule = () => {
      if (!active || pollingStopped) return;
      setPollingState('SCHEDULED');
      const delay = document.hidden
        ? Math.max(pollIntervalMs, 10_000)
        : pollIntervalMs;
      timer = setTimeout(fetchNext, delay);
    };

    const fetchNext = async () => {
      if (!active || pollingStopped) return;
      timer = undefined;
      inFlight = true;
      controller = new AbortController();
      setPollingState('IN_FLIGHT');
      try {
        const nextDetail = await getTestRunDetail(runId, controller.signal);
        if (!active) return;
        transientFailures = 0;
        setDetail(nextDetail);
        setError(null);
        setStale(false);
        if (nextDetail.status === 'FINISHED') {
          pollingStopped = true;
          setPollingState('FINISHED');
          return;
        }
        schedule();
      } catch (nextError) {
        if (!active || controller.signal.aborted) return;
        setError(nextError);
        if (isTerminalError(nextError)) {
          pollingStopped = true;
          setPollingState('TERMINAL_ERROR');
          return;
        }
        setStale(true);
        setPollingState('TRANSIENT_ERROR');
        transientFailures += 1;
        if (transientFailures >= MAX_TRANSIENT_FAILURES) {
          pollingStopped = true;
          setPollingState('TERMINAL_ERROR');
          return;
        }
        schedule();
      } finally {
        inFlight = false;
      }
    };

    const handleVisibilityChange = () => {
      if (!active || pollingStopped || inFlight) return;
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (document.hidden) schedule();
      else fetchNext();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fetchNext();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runId, pollIntervalMs, refreshToken]);

  return {
    detail,
    error,
    stale,
    autoRefreshStopped: pollingState === 'TERMINAL_ERROR',
    isLoading: Boolean(runId) && detail === null && pollingState !== 'TERMINAL_ERROR',
    refresh,
  };
}
