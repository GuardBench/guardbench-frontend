import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../services/apiClient';
import {
  getComparableTestRuns,
  getTestRunComparison,
  type ComparableTestRunListItemRes,
  type ComparableTestRunListRes,
  type TestRunComparisonRes,
} from '../services/regressionService';

export interface RegressionComparisonState {
  candidates: ComparableTestRunListItemRes[];
  candidatePage: number;
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
  hasLoadedCandidates: boolean;
  setCandidatePage: (page: number | ((current: number) => number)) => void;
  selectComparison: (runId: string) => void;
  refresh: () => void;
}

export function useRegressionComparison(runId: string): RegressionComparisonState {
  const [candidates, setCandidates] = useState<ComparableTestRunListItemRes[]>([]);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidatePageMeta, setCandidatePageMeta] = useState<ComparableTestRunListRes['page'] | null>(null);
  const [selectedComparisonId, setSelectedComparisonId] = useState('');
  const [selectedAutomatically, setSelectedAutomatically] = useState(false);
  const [comparison, setComparison] = useState<TestRunComparisonRes | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<unknown>(null);
  const [comparisonError, setComparisonError] = useState<unknown>(null);
  const [notFinished, setNotFinished] = useState(false);
  const [hasLoadedCandidates, setHasLoadedCandidates] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setCandidatePage(1);
  }, [runId]);

  useEffect(() => {
    if (!runId) return;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    setCandidatesLoading(true);
    setCandidatesError(null);
    setNotFinished(false);
    setHasLoadedCandidates(false);
    setCandidates([]);
    setCandidatePageMeta(null);
    setSelectedComparisonId('');
    setSelectedAutomatically(false);
    setComparison(null);
    setComparisonError(null);

    getComparableTestRuns(runId, { page: candidatePage, size: 20 })
      .then((response) => {
        if (!active) return;
        const firstCandidateId = response.items[0] ? String(response.items[0].id) : '';
        setCandidates(response.items);
        setCandidatePageMeta(response.page);
        setSelectedComparisonId(firstCandidateId);
        setSelectedAutomatically(Boolean(firstCandidateId));
        setHasLoadedCandidates(true);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.code === 'TEST_RUN_NOT_FINISHED') {
          setNotFinished(true);
          setHasLoadedCandidates(true);
          retryTimer = setTimeout(() => {
            if (active) setReloadToken((value) => value + 1);
          }, 2000);
          return;
        }
        setCandidatesError(error);
      })
      .finally(() => {
        if (active) setCandidatesLoading(false);
      });

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [runId, candidatePage, reloadToken]);

  useEffect(() => {
    if (!runId || !selectedComparisonId) return;
    let active = true;

    setComparisonLoading(true);
    setComparisonError(null);
    setComparison(null);

    getTestRunComparison(runId, selectedComparisonId)
      .then((response) => {
        if (active) setComparison(response);
      })
      .catch((error) => {
        if (active) setComparisonError(error);
      })
      .finally(() => {
        if (active) setComparisonLoading(false);
      });

    return () => { active = false; };
  }, [runId, selectedComparisonId]);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => String(candidate.id) === selectedComparisonId),
    [candidates, selectedComparisonId],
  );

  return {
    candidates,
    candidatePage,
    candidatePageMeta,
    selectedComparisonId,
    selectedCandidate,
    selectedAutomatically,
    comparison,
    candidatesLoading,
    comparisonLoading,
    candidatesError,
    comparisonError,
    notFinished,
    hasLoadedCandidates,
    setCandidatePage,
    selectComparison: (nextRunId) => {
      setSelectedComparisonId(nextRunId);
      setSelectedAutomatically(false);
    },
    refresh: () => setReloadToken((value) => value + 1),
  };
}
