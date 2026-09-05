import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../services/apiClient';
import {
  getComparableTestRuns,
  getTestRunComparison,
  getTestRunComparisonSummary,
  type ComparableTestRunListItemRes,
  type ComparableTestRunListRes,
  type TestRunComparisonRes,
  type TestRunComparisonSummaryRes,
} from '../services/regressionService';
import {
  comparisonKey,
  preserveSelectedCandidate,
  shouldLoadComparison,
  shouldLoadSummary,
  shouldRefreshRegressionCandidates,
} from './regressionComparisonState';

const AUTO_RETRY_LIMIT = 5;
const AUTO_RETRY_DELAY_MS = 2000;

interface RegressionStore {
  runId: string;
  candidates: ComparableTestRunListItemRes[];
  candidatePage: number;
  candidatePageMeta: ComparableTestRunListRes['page'] | null;
  selectedComparisonId: string;
  selectedAutomatically: boolean;
  candidatesLoading: boolean;
  candidatesError: unknown;
  notFinished: boolean;
  autoRetryCount: number;
  hasLoadedCandidates: boolean;
  candidateReloadToken: number;
  summary: TestRunComparisonSummaryRes | null;
  summaryLoadedKey: string;
  summaryError: unknown;
  summaryErrorKey: string;
  summaryReloadToken: number;
  comparison: TestRunComparisonRes | null;
  comparisonLoadedKey: string;
  comparisonError: unknown;
  comparisonErrorKey: string;
  comparisonReloadToken: number;
}

export interface RegressionSummaryState {
  runId: string;
  selectedCandidate: ComparableTestRunListItemRes | undefined;
  selectedAutomatically: boolean;
  summary: TestRunComparisonSummaryRes | null;
  loading: boolean;
  error: unknown;
  notFinished: boolean;
  autoRetryExhausted: boolean;
  hasLoadedCandidates: boolean;
  hasComparableRun: boolean;
  retry: () => void;
}

export interface RegressionDetailState {
  runId: string;
  candidates: ComparableTestRunListItemRes[];
  candidatePageMeta: ComparableTestRunListRes['page'] | null;
  selectedComparisonId: string;
  selectedCandidate: ComparableTestRunListItemRes | undefined;
  selectedAutomatically: boolean;
  comparison: TestRunComparisonRes | null;
  candidatesLoading: boolean;
  comparisonLoading: boolean;
  candidatesError: unknown;
  comparisonError: unknown;
  notFinished: boolean;
  autoRetryExhausted: boolean;
  hasLoadedCandidates: boolean;
  setCandidatePage: (page: number | ((current: number) => number)) => void;
  selectComparison: (runId: string) => void;
  refreshCandidates: () => void;
  refreshComparison: () => void;
}

export interface RegressionComparisonState {
  summary: RegressionSummaryState;
  detail: RegressionDetailState;
}

const initialStore = (runId: string): RegressionStore => ({
  runId,
  candidates: [],
  candidatePage: 1,
  candidatePageMeta: null,
  selectedComparisonId: '',
  selectedAutomatically: false,
  candidatesLoading: Boolean(runId),
  candidatesError: null,
  notFinished: false,
  autoRetryCount: 0,
  hasLoadedCandidates: false,
  candidateReloadToken: 0,
  summary: null,
  summaryLoadedKey: '',
  summaryError: null,
  summaryErrorKey: '',
  summaryReloadToken: 0,
  comparison: null,
  comparisonLoadedKey: '',
  comparisonError: null,
  comparisonErrorKey: '',
  comparisonReloadToken: 0,
});

export function useRegressionComparison(runId: string, loadDetails: boolean): RegressionComparisonState {
  const [store, setStore] = useState<RegressionStore>(() => initialStore(runId));
  const retryRunIdRef = useRef(runId);
  const autoRetryCountRef = useRef(0);

  // 새 Run을 commit하기 전에 저장소를 교체해 이전 Run의 요약이 한 프레임 노출되지 않게 한다.
  if (store.runId !== runId) {
    setStore(initialStore(runId));
  }

  const current = store.runId === runId ? store : initialStore(runId);
  const selectedKey = comparisonKey(runId, current.selectedComparisonId);

  useEffect(() => {
    if (!runId) return;
    if (retryRunIdRef.current !== runId) {
      retryRunIdRef.current = runId;
      autoRetryCountRef.current = 0;
    }
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    getComparableTestRuns(runId, { page: current.candidatePage, size: 20 })
      .then((response) => {
        if (!active) return;
        setStore((previous) => {
          if (previous.runId !== runId) return previous;
          const candidateIds = response.items.map((candidate) => String(candidate.id));
          const nextSelection = preserveSelectedCandidate(previous.selectedComparisonId, candidateIds);
          const selectionChanged = nextSelection !== previous.selectedComparisonId;
          autoRetryCountRef.current = 0;
          return {
            ...previous,
            candidates: response.items,
            candidatePageMeta: response.page,
            selectedComparisonId: nextSelection,
            selectedAutomatically: selectionChanged ? Boolean(nextSelection) : previous.selectedAutomatically,
            candidatesLoading: false,
            candidatesError: null,
            notFinished: false,
            autoRetryCount: 0,
            hasLoadedCandidates: true,
            ...(selectionChanged ? {
              summary: null,
              summaryLoadedKey: '',
              summaryError: null,
              summaryErrorKey: '',
              comparison: null,
              comparisonLoadedKey: '',
              comparisonError: null,
              comparisonErrorKey: '',
            } : {}),
          };
        });
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.code === 'TEST_RUN_NOT_FINISHED') {
          const nextRetryCount = autoRetryCountRef.current + 1;
          autoRetryCountRef.current = nextRetryCount;
          setStore((previous) => {
            if (previous.runId !== runId) return previous;
            return {
              ...previous,
              candidatesLoading: false,
              candidatesError: null,
              notFinished: true,
              autoRetryCount: nextRetryCount,
              hasLoadedCandidates: true,
            };
          });
          if (nextRetryCount < AUTO_RETRY_LIMIT) {
            retryTimer = setTimeout(() => {
              if (!active) return;
              setStore((latest) => latest.runId === runId ? {
                ...latest,
                candidatesLoading: true,
                candidateReloadToken: latest.candidateReloadToken + 1,
              } : latest);
            }, AUTO_RETRY_DELAY_MS);
          }
          return;
        }
        setStore((previous) => previous.runId === runId ? {
          ...previous,
          candidatesLoading: false,
          candidatesError: error,
        } : previous);
      });

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [runId, current.candidatePage, current.candidateReloadToken]);

  const summaryNeedsLoad = shouldLoadSummary(
    loadDetails,
    selectedKey,
    current.summaryLoadedKey,
    current.summaryErrorKey,
    current.comparisonLoadedKey,
  );
  useEffect(() => {
    if (!summaryNeedsLoad) return;
    let active = true;
    const requestKey = selectedKey;
    getTestRunComparisonSummary(runId, current.selectedComparisonId)
      .then((summary) => {
        if (!active) return;
        setStore((previous) => previous.runId === runId && comparisonKey(runId, previous.selectedComparisonId) === requestKey
          ? { ...previous, summary, summaryLoadedKey: requestKey, summaryError: null, summaryErrorKey: '' }
          : previous);
      })
      .catch((error) => {
        if (!active) return;
        setStore((previous) => previous.runId === runId && comparisonKey(runId, previous.selectedComparisonId) === requestKey
          ? { ...previous, summary: null, summaryLoadedKey: '', summaryError: error, summaryErrorKey: requestKey }
          : previous);
      });
    return () => { active = false; };
  }, [loadDetails, runId, current.selectedComparisonId, current.summaryReloadToken, selectedKey, summaryNeedsLoad]);

  const comparisonNeedsLoad = loadDetails
    && shouldLoadComparison(selectedKey, current.comparisonLoadedKey, current.comparisonErrorKey);
  useEffect(() => {
    if (!comparisonNeedsLoad) return;
    let active = true;
    const requestKey = selectedKey;
    getTestRunComparison(runId, current.selectedComparisonId)
      .then((comparison) => {
        if (!active) return;
        setStore((previous) => previous.runId === runId && comparisonKey(runId, previous.selectedComparisonId) === requestKey
          ? { ...previous, comparison, comparisonLoadedKey: requestKey, comparisonError: null, comparisonErrorKey: '' }
          : previous);
      })
      .catch((error) => {
        if (!active) return;
        setStore((previous) => previous.runId === runId && comparisonKey(runId, previous.selectedComparisonId) === requestKey
          ? { ...previous, comparison: null, comparisonLoadedKey: '', comparisonError: error, comparisonErrorKey: requestKey }
          : previous);
      });
    return () => { active = false; };
  }, [loadDetails, runId, current.selectedComparisonId, current.comparisonReloadToken, selectedKey, comparisonNeedsLoad]);

  const selectedCandidate = useMemo(
    () => current.candidates.find((candidate) => String(candidate.id) === current.selectedComparisonId),
    [current.candidates, current.selectedComparisonId],
  );
  const refreshCandidates = () => {
    autoRetryCountRef.current = 0;
    setStore((previous) => previous.runId === runId ? {
      ...previous,
      candidatesLoading: Boolean(runId),
      candidatesError: null,
      notFinished: false,
      autoRetryCount: 0,
      candidateReloadToken: previous.candidateReloadToken + 1,
    } : previous);
  };
  const refreshSummary = () => setStore((previous) => previous.runId === runId ? {
    ...previous,
    summary: null,
    summaryLoadedKey: '',
    summaryError: null,
    summaryErrorKey: '',
    summaryReloadToken: previous.summaryReloadToken + 1,
  } : previous);
  const refreshComparison = () => setStore((previous) => previous.runId === runId ? {
    ...previous,
    comparison: null,
    comparisonLoadedKey: '',
    comparisonError: null,
    comparisonErrorKey: '',
    comparisonReloadToken: previous.comparisonReloadToken + 1,
  } : previous);

  const candidatesLoading = current.candidatesLoading;
  const summaryError = current.candidatesError
    ?? (current.summaryErrorKey === selectedKey ? current.summaryError : null);
  const visibleSummary = current.comparisonLoadedKey === selectedKey
    ? current.comparison
    : current.summaryLoadedKey === selectedKey ? current.summary : null;
  return {
    summary: {
      runId: current.runId,
      selectedCandidate,
      selectedAutomatically: current.selectedAutomatically,
      summary: visibleSummary,
      loading: candidatesLoading || summaryNeedsLoad,
      error: summaryError,
      notFinished: current.notFinished,
      autoRetryExhausted: current.notFinished && current.autoRetryCount >= AUTO_RETRY_LIMIT,
      hasLoadedCandidates: current.hasLoadedCandidates,
      hasComparableRun: current.candidates.length > 0,
      retry: shouldRefreshRegressionCandidates(
        current.candidates.length,
        current.candidatesError !== null,
        current.notFinished,
      ) ? refreshCandidates : refreshSummary,
    },
    detail: {
      runId: current.runId,
      candidates: current.candidates,
      candidatePageMeta: current.candidatePageMeta,
      selectedComparisonId: current.selectedComparisonId,
      selectedCandidate,
      selectedAutomatically: current.selectedAutomatically,
      comparison: current.comparisonLoadedKey === selectedKey ? current.comparison : null,
      candidatesLoading,
      comparisonLoading: candidatesLoading || (loadDetails && comparisonNeedsLoad),
      candidatesError: current.candidatesError,
      comparisonError: current.comparisonErrorKey === selectedKey ? current.comparisonError : null,
      notFinished: current.notFinished,
      autoRetryExhausted: current.notFinished && current.autoRetryCount >= AUTO_RETRY_LIMIT,
      hasLoadedCandidates: current.hasLoadedCandidates,
      setCandidatePage: (page) => setStore((previous) => {
        if (previous.runId !== runId) return previous;
        const nextPage = typeof page === 'function' ? page(previous.candidatePage) : page;
        return { ...previous, candidatePage: nextPage, candidatesLoading: true, candidatesError: null,
          candidateReloadToken: previous.candidateReloadToken + 1 };
      }),
      selectComparison: (nextRunId) => setStore((previous) => previous.runId === runId ? {
        ...previous,
        selectedComparisonId: nextRunId,
        selectedAutomatically: false,
        summary: null,
        summaryLoadedKey: '',
        summaryError: null,
        summaryErrorKey: '',
        comparison: null,
        comparisonLoadedKey: '',
        comparisonError: null,
        comparisonErrorKey: '',
      } : previous),
      refreshCandidates,
      refreshComparison,
    },
  };
}
