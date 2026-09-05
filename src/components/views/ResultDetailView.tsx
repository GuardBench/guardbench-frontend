import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Eye, Loader2, RefreshCw, X } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import {
  getTestRunEvaluatorMetrics,
  getTestRunResults,
  type EvaluationOutcome,
  type EvaluatorMetricsRes,
  type QualityGateMetricRes,
  type TestRunResultAttentionType,
  type TestRunResultFacetsRes,
  type TestRunResultListItemRes,
  type PageMetaRes,
} from '../../services/testRunService';
import { useLiveRunProgress } from '../../hooks/useLiveRunProgress';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { LAYER_CLASS } from '../../config/layers';
import { RequestErrorBanner } from '../common/RequestErrorBanner';
import { RunProgressStepper } from '../common/RunProgressStepper';
import { StatusPill } from '../common/StatusPill';
import { EVALUATION_OUTCOME_PRESENTATION, evaluationOutcomeLabel } from './evaluationOutcomePresentation';
import {
  failedQualityGateReasons,
  QUALITY_GATE_METRIC_PRESENTATION,
  qualityGatePercentageLabels,
  qualityGateTitle,
} from './qualityGatePresentation';

interface ResultDetailViewProps {
  selectedRunId?: string;
  onGoNewRun: () => void;
  onRunFinished?: (runId: string) => boolean;
  onRefreshRegression?: () => void;
  regressionRefreshing?: boolean;
  regressionSummary?: React.ReactNode;
}

const executionLabel = (status: TestRunResultListItemRes['executionStatus']) => ({
  SUCCEEDED: '정상 처리', FAILED: '처리 실패', TIMED_OUT: '시간 초과', NOT_STARTED: '미실행',
}[status]);

const severityPresentation: Record<TestRunResultListItemRes['severity'], { label: string; className: string }> = {
  CRITICAL: { label: 'CRITICAL', className: 'bg-[#a8322d] text-white' },
  HIGH: { label: 'HIGH', className: 'bg-[#fff0ef] text-[#a8322d]' },
  MEDIUM: { label: 'MEDIUM', className: 'bg-[#fff7e8] text-[#8a570f]' },
  LOW: { label: 'LOW', className: 'bg-[#eef1f4] text-[#586473]' },
};

const errorStageLabel = (stage: NonNullable<TestRunResultListItemRes['error']>['stage']) => (
  stage === 'APPLICATION_TARGET' ? '대상 애플리케이션 실행' : '판정 처리'
);

type OutcomeFilter = 'ALL' | EvaluationOutcome;

type ResultFilters = {
  name: string;
  input: string;
  category: string;
  expectedAction: '' | 'ALLOW' | 'BLOCK';
  severity: '' | TestRunResultListItemRes['severity'];
  executionStatus: '' | TestRunResultListItemRes['executionStatus'];
  assertionStatus: '' | 'PASS' | 'FAIL';
  evaluationOutcome: OutcomeFilter;
  sort: '' | 'severity,desc' | 'severity,asc' | 'name,asc' | 'name,desc';
};

const EMPTY_RESULT_FILTERS: ResultFilters = {
  name: '', input: '', category: '', expectedAction: '', severity: '', executionStatus: '',
  assertionStatus: '', evaluationOutcome: 'ALL', sort: '',
};

const ATTENTION_TYPES: Array<{ type: TestRunResultAttentionType; label: string; tone: string }> = [
  { type: 'FALSE_NEGATIVE', label: EVALUATION_OUTCOME_PRESENTATION.FALSE_NEGATIVE.label, tone: 'border-[#f4c7c3] bg-[#fff0ef] text-[#a8322d]' },
  { type: 'FALSE_POSITIVE', label: EVALUATION_OUTCOME_PRESENTATION.FALSE_POSITIVE.label, tone: 'border-[#f0ddb0] bg-[#fff7e8] text-[#9a5c0a]' },
  { type: 'EXECUTION_FAILED', label: '처리 실패', tone: 'border-[#dfe5e9] bg-[#f6f8f9] text-[#43515d]' },
  { type: 'TIMED_OUT', label: '시간 초과', tone: 'border-[#dfe5e9] bg-[#f6f8f9] text-[#43515d]' },
  { type: 'NOT_STARTED', label: '미실행', tone: 'border-[#dfe5e9] bg-[#f6f8f9] text-[#43515d]' },
];

const OUTCOME_FILTERS: Array<{ value: OutcomeFilter; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'FALSE_NEGATIVE', label: evaluationOutcomeLabel('FALSE_NEGATIVE') },
  { value: 'FALSE_POSITIVE', label: evaluationOutcomeLabel('FALSE_POSITIVE') },
  { value: 'TRUE_POSITIVE', label: evaluationOutcomeLabel('TRUE_POSITIVE') },
  { value: 'TRUE_NEGATIVE', label: evaluationOutcomeLabel('TRUE_NEGATIVE') },
];

const percentageLabel = (rate: number) => `${(Math.floor(rate * 10_000) / 100).toFixed(2)}%`;

const rateLabel = (rate: number | null) => rate === null ? '분모 없음' : percentageLabel(rate);

const QualityGateMetricEvidence = ({ metricKey, metric }: {
  metricKey: keyof typeof QUALITY_GATE_METRIC_PRESENTATION;
  metric: QualityGateMetricRes;
}) => {
  const presentation = QUALITY_GATE_METRIC_PRESENTATION[metricKey];
  const { valueLabel, thresholdLabel } = qualityGatePercentageLabels(metric.value, metric.threshold);
  return <div className="rounded-xl border border-black/10 bg-white/60 p-3">
    <dt className="text-[#697586]">{presentation.label}</dt>
    <dd className="mt-1">
      <span className="block font-black text-[#17202a]">현재 {valueLabel}</span>
      <span className="mt-0.5 block text-[11px] font-medium text-[#697586]">최소 기준 {thresholdLabel}</span>
      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${metric.passed ? 'bg-[#d9f2e5] text-[#146c4c]' : 'bg-[#f9d9d6] text-[#a8322d]'}`}>
        {metric.passed ? '기준 충족' : '기준 미달'}
      </span>
    </dd>
  </div>;
};

const metricCount = (metrics: EvaluatorMetricsRes | null, outcome: EvaluationOutcome) => {
  if (!metrics) return null;
  return {
    TRUE_POSITIVE: metrics.truePositive,
    TRUE_NEGATIVE: metrics.trueNegative,
    FALSE_POSITIVE: metrics.falsePositive,
    FALSE_NEGATIVE: metrics.falseNegative,
  }[outcome];
};

const SummaryMetric = ({ label, value, tone = 'neutral', onClick }: {
  label: string;
  value: number | null;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}) => {
  const toneClass = {
    neutral: 'text-[#17202a]',
    success: 'text-[#146c4c]',
    warning: 'text-[#9a5c0a]',
    danger: 'text-[#a8322d]',
  }[tone];
  const cardClassName = 'flex min-h-[78px] h-full w-full flex-col justify-center rounded-xl border border-[#e5e9ee] bg-white/90 p-3 text-left';
  const content = <>
    <span className="text-[11px] font-bold text-[#697586]">{label}</span>
    <strong className={`mt-1 text-2xl font-black ${toneClass}`}>{value ?? '—'}{value !== null && <span className="ml-0.5 text-xs font-bold">건</span>}</strong>
  </>;
  return onClick
    ? <button type="button" onClick={onClick} className={`${cardClassName} appearance-none transition hover:border-[#b8c2ca] focus:outline-none focus:ring-2 focus:ring-[#17202a]`}>{content}</button>
    : <div className={cardClassName}>{content}</div>;
};

const MatrixCell = ({ outcome, count, rate }: {
  outcome: EvaluationOutcome;
  count: number | null;
  rate?: number | null;
}) => {
  const presentation = EVALUATION_OUTCOME_PRESENTATION[outcome];
  return <div className={`min-w-[150px] rounded-xl border p-4 ${presentation.cellClassName}`}>
    <div className="flex items-start justify-between gap-2">
      <span className={`text-sm font-black ${presentation.labelClassName}`}>{presentation.label}</span>
      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-[#697586]">{presentation.shortCode}</span>
    </div>
    <strong className={`mt-2 block text-2xl ${presentation.labelClassName}`}>{count ?? '—'}{count !== null && <span className="ml-0.5 text-xs">건</span>}</strong>
    <span className="mt-1 block text-[11px] text-[#586473]">{presentation.transition}</span>
    {rate !== undefined && <span className="mt-1 block text-[10px] text-[#697586]">비율 {rateLabel(rate)}</span>}
  </div>;
};

const ResultMeaning = ({ item }: { item: TestRunResultListItemRes }) => {
  const presentation = item.evaluationOutcome ? EVALUATION_OUTCOME_PRESENTATION[item.evaluationOutcome] : null;
  const attention = item.attentionType
    ? ATTENTION_TYPES.find(({ type }) => type === item.attentionType) : null;
  return presentation
    ? <><b className={`block text-sm ${presentation.labelClassName}`}>{presentation.label} <span className="text-[10px] text-[#697586]">{presentation.shortCode}</span></b><span className="mt-1 block text-[#586473]">{presentation.transition}</span></>
    : <><b className="block text-sm text-[#586473]">{attention?.label ?? '판정 미완료'}</b><span className="mt-1 block text-[#697586]">{executionLabel(item.executionStatus)}로 판정을 확인할 수 없습니다.</span></>;
};
export const ResultDetailView: React.FC<ResultDetailViewProps> = ({
  selectedRunId,
  onGoNewRun,
  onRunFinished,
  onRefreshRegression,
  regressionRefreshing = false,
  regressionSummary,
}) => {
  const [results, setResults] = useState<TestRunResultListItemRes[]>([]);
  const [resultPage, setResultPage] = useState(1);
  const [filters, setFilters] = useState<ResultFilters>(EMPTY_RESULT_FILTERS);
  const [attentionTypes, setAttentionTypes] = useState<TestRunResultAttentionType[]>([]);
  const [attentionFacets, setAttentionFacets] = useState<TestRunResultFacetsRes | null>(null);
  const loadedFacetFilterKeyRef = useRef<string | null>(null);
  const attentionInitializedRunIdRef = useRef<string | null>(null);
  const [pageMeta, setPageMeta] = useState<PageMetaRes | null>(null);
  const [evaluatorMetrics, setEvaluatorMetrics] = useState<EvaluatorMetricsRes | null>(null);
  const [loadedMetricsRunId, setLoadedMetricsRunId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TestRunResultListItemRes | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [loadedResultsQueryKey, setLoadedResultsQueryKey] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [notFinishedRaceRunId, setNotFinishedRaceRunId] = useState<string | null>(null);
  const [raceRecoveryExhaustedRunId, setRaceRecoveryExhaustedRunId] = useState<string | null>(null);
  const [resultsError, setResultsError] = useState<unknown>(null);
  const [metricsError, setMetricsError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const raceRetryCountRef = useRef(0);
  const raceRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifiedFinishedRunIdRef = useRef<string | null>(null);
  const {
    detail,
    error: detailError,
    stale: detailStale,
    autoRefreshStopped,
    isLoading: detailLoading,
    isRefreshing: detailRefreshing,
    refresh: refreshDetail,
  } = useLiveRunProgress({ runId: selectedRunId ?? null });

  useEffect(() => {
    if (!selectedRunId || detail?.status !== 'FINISHED' || String(detail.id) !== selectedRunId) return;
    if (notifiedFinishedRunIdRef.current === selectedRunId) return;
    const regressionRefreshed = onRunFinished?.(selectedRunId) ?? false;
    if (regressionRefreshed) notifiedFinishedRunIdRef.current = selectedRunId;
  }, [detail?.id, detail?.status, onRunFinished, selectedRunId]);

  const closeResultDialog = useCallback(() => setSelected(null), []);
  const resultDialogRef = useDialogFocus({ isOpen: selected !== null, onClose: closeResultDialog });
  const notFinishedRace = notFinishedRaceRunId === selectedRunId;
  const raceRecoveryExhausted = raceRecoveryExhaustedRunId === selectedRunId;
  const resultFilterKey = JSON.stringify({ filters, attentionTypes });
  const resultQueryKey = `${selectedRunId ?? ''}:${resultPage}:${resultFilterKey}`;
  const hasLoadedResults = loadedResultsQueryKey === resultQueryKey;
  const visibleResults = hasLoadedResults ? results : [];
  const visiblePageMeta = hasLoadedResults ? pageMeta : null;

  const selectAttentionTypes = useCallback((nextTypes: TestRunResultAttentionType[]) => {
    setAttentionTypes(nextTypes);
    setResultPage(1);
  }, []);

  const toggleAttentionType = useCallback((type: TestRunResultAttentionType) => {
    setAttentionTypes((current) => current.includes(type)
      ? current.filter((currentType) => currentType !== type)
      : [...current, type]);
    setResultPage(1);
  }, []);

  const recoverNotFinishedRace = useCallback(() => {
    if (!selectedRunId) return;
    setNotFinishedRaceRunId(selectedRunId);
    if (raceRetryTimerRef.current) return;
    if (raceRetryCountRef.current >= 3) {
      setRaceRecoveryExhaustedRunId(selectedRunId);
      return;
    }
    raceRetryCountRef.current += 1;
    raceRetryTimerRef.current = setTimeout(() => {
      raceRetryTimerRef.current = null;
      setNotFinishedRaceRunId(null);
      setRaceRecoveryExhaustedRunId(null);
      refreshDetail();
      setReloadToken((value) => value + 1);
    }, 1000);
  }, [refreshDetail, selectedRunId]);

  useEffect(() => {
    raceRetryCountRef.current = 0;
    if (raceRetryTimerRef.current) clearTimeout(raceRetryTimerRef.current);
    raceRetryTimerRef.current = null;
    return () => {
      if (raceRetryTimerRef.current) clearTimeout(raceRetryTimerRef.current);
      raceRetryTimerRef.current = null;
    };
  }, [selectedRunId]);

  const refreshAll = () => {
    raceRetryCountRef.current = 0;
    if (raceRetryTimerRef.current) clearTimeout(raceRetryTimerRef.current);
    raceRetryTimerRef.current = null;
    loadedFacetFilterKeyRef.current = null;
    setNotFinishedRaceRunId(null);
    setRaceRecoveryExhaustedRunId(null);
    refreshDetail();
    setReloadToken((value) => value + 1);
    onRefreshRegression?.();
  };

  useEffect(() => {
    if (!selectedRunId || detail?.status !== 'FINISHED') return;
    let active = true;
    const loadResults = async () => {
      setResultsLoading(true);
      setResultsError(null);
      const includeFacets = loadedFacetFilterKeyRef.current !== resultFilterKey ? 'attention' : undefined;
      try {
        const nextResults = await getTestRunResults(selectedRunId, {
          page: resultPage,
          size: 100,
          ...(filters.name ? { name: filters.name } : {}),
          ...(filters.input ? { input: filters.input } : {}),
          ...(filters.category ? { category: filters.category } : {}),
          ...(filters.expectedAction ? { expectedAction: filters.expectedAction } : {}),
          ...(filters.severity ? { severity: filters.severity } : {}),
          ...(filters.executionStatus ? { executionStatus: filters.executionStatus } : {}),
          ...(filters.assertionStatus ? { assertionStatus: filters.assertionStatus } : {}),
          ...(filters.evaluationOutcome === 'ALL' ? {} : { evaluationOutcome: filters.evaluationOutcome }),
          ...(filters.sort ? { sort: [filters.sort] } : {}),
          ...(attentionTypes.length ? { attentionType: attentionTypes } : {}),
          ...(includeFacets ? { includeFacets } : {}),
        });
        if (active) {
          setResults(nextResults.items);
          setPageMeta(nextResults.page);
          setLoadedResultsQueryKey(resultQueryKey);
          if (nextResults.facets) {
            setAttentionFacets(nextResults.facets);
            loadedFacetFilterKeyRef.current = resultFilterKey;
            if (attentionInitializedRunIdRef.current !== selectedRunId) {
              attentionInitializedRunIdRef.current = selectedRunId;
              if (nextResults.facets.attentionTotal > 0) {
                setAttentionTypes(ATTENTION_TYPES.map(({ type }) => type));
                setResultPage(1);
              }
            }
          }
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.code === 'TEST_RUN_NOT_FINISHED') {
          recoverNotFinishedRace();
          setResults([]);
          setPageMeta(null);
          setLoadedResultsQueryKey(null);
        } else {
          setResultsError(error);
        }
      } finally {
        if (active) setResultsLoading(false);
      }
    };
    loadResults();
    return () => { active = false; };
  }, [
    selectedRunId, reloadToken, detail?.status, resultPage, filters, attentionTypes,
    resultFilterKey,
    recoverNotFinishedRace, resultQueryKey,
  ]);

  useEffect(() => {
    if (!selectedRunId || detail?.status !== 'FINISHED') return;
    let active = true;
    const loadMetrics = async () => {
      setMetricsLoading(true);
      setMetricsError(null);
      try {
        const nextMetrics = await getTestRunEvaluatorMetrics(selectedRunId);
        if (active) {
          setEvaluatorMetrics(nextMetrics);
          setLoadedMetricsRunId(selectedRunId);
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.code === 'TEST_RUN_NOT_FINISHED') {
          recoverNotFinishedRace();
        } else {
          setMetricsError(error);
        }
      } finally {
        if (active) setMetricsLoading(false);
      }
    };
    loadMetrics();
    return () => { active = false; };
  }, [selectedRunId, reloadToken, detail?.status, recoverNotFinishedRace]);

  const notFinished = detail?.status !== 'FINISHED' || notFinishedRace;
  const refreshInProgress = detailLoading
    || detailRefreshing
    || resultsLoading
    || metricsLoading
    || regressionRefreshing;

  if (!detailLoading && detailError && !detail) {
    return <section className="space-y-6 animate-rise">
      <h1 className="text-3xl font-extrabold text-[#17202a]">테스트 결과 상세</h1>
      {autoRefreshStopped && <div className="rounded-xl border border-[#f0ddb0] bg-[#fff7e8] px-4 py-3 text-xs font-bold text-[#78501b]">자동 갱신이 중단됐습니다. 다시 시도를 눌러주세요.</div>}
      <RequestErrorBanner error={detailError} fallbackMessage="테스트 실행 상세를 불러오지 못했습니다." onRetry={refreshAll} />
    </section>;
  }

  const gateStatus = detail?.qualityGate?.status ?? 'NOT_EVALUATED_BEFORE_FINISH';
  const gateTitle = qualityGateTitle(detail?.qualityGate?.status ?? null);
  const metrics = detail?.qualityGate?.metrics;
  const gateFailureReasons = gateStatus === 'FAIL' ? failedQualityGateReasons(metrics ?? null) : [];
  const visibleEvaluatorMetrics = loadedMetricsRunId === selectedRunId ? evaluatorMetrics : null;
  const evaluatedCount = visibleEvaluatorMetrics
    ? visibleEvaluatorMetrics.truePositive + visibleEvaluatorMetrics.trueNegative + visibleEvaluatorMetrics.falsePositive + visibleEvaluatorMetrics.falseNegative
    : null;
  const normalCount = visibleEvaluatorMetrics
    ? visibleEvaluatorMetrics.truePositive + visibleEvaluatorMetrics.trueNegative
    : null;
  const mismatchCount = attentionFacets
    ? attentionFacets.attentionTypes.FALSE_NEGATIVE + attentionFacets.attentionTypes.FALSE_POSITIVE
    : visibleEvaluatorMetrics
      ? visibleEvaluatorMetrics.falsePositive + visibleEvaluatorMetrics.falseNegative : null;
  const incompleteCount = attentionFacets
    ? attentionFacets.attentionTypes.EXECUTION_FAILED
      + attentionFacets.attentionTypes.TIMED_OUT
      + attentionFacets.attentionTypes.NOT_STARTED
    : detail && evaluatedCount !== null
      ? Math.max(0, detail.testCaseCount - evaluatedCount) : null;
  const attentionCount = attentionFacets?.attentionTotal
    ?? (mismatchCount !== null && incompleteCount !== null ? mismatchCount + incompleteCount : null);
  const summaryDescription = notFinished
    ? '실행이 끝나면 판정 결과와 확인이 필요한 케이스를 집계합니다.'
    : gateStatus === 'NOT_EVALUATED'
      ? `${detail?.testCaseCount ?? 0}건 중 기대 일치 여부를 판정할 수 있는 결과가 없어 판정을 완료하지 못했습니다.`
      : attentionCount === null
        ? '결과 집계를 불러오는 중입니다.'
        : attentionCount === 0
          ? `${detail?.testCaseCount ?? 0}건 모두 기대한 동작과 일치했습니다.`
          : `${detail?.testCaseCount ?? 0}건 중 ${attentionCount}건을 확인해야 합니다.`;

  return <section className="space-y-6 animate-rise">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1a7f5a]">
          <span>Run #{detail?.id ?? selectedRunId ?? '—'}</span><StatusPill kind="progress" status={detail?.status ?? 'QUEUED'} />
          {detailLoading && <Loader2 size={13} className="animate-spin" />}
        </div>
        <h1 className="text-2xl font-extrabold text-[#17202a] sm:text-3xl">테스트 결과 상세</h1>
        <p className="mt-1.5 text-sm text-[#697586]">Suite #{detail?.testSuiteId ?? '—'} · {detail?.testCaseCount ?? 0} snapshots</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={refreshAll} disabled={refreshInProgress} aria-busy={refreshInProgress} className="inline-flex items-center gap-2 rounded-xl border border-[#e5e9ee] bg-white px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={14} className={refreshInProgress ? 'animate-spin' : undefined} />{refreshInProgress ? '새로고침 중' : '새로고침'}</button>
        <button type="button" onClick={onGoNewRun} className="rounded-xl bg-[#17202a] px-4 py-2 text-xs font-bold text-white">다시 실행</button>
      </div>
    </header>

    {regressionSummary}

    {notFinishedRace && !detailLoading
      ? <div className="flex items-center gap-2 rounded-xl border border-[#f0ddb0] bg-[#fff7e8] px-4 py-3 text-xs text-[#78501b]"><AlertCircle size={14} />{raceRecoveryExhausted ? '결과 준비 상태를 확인하지 못했습니다. 다시 시도해 주세요.' : '실행은 종료됐지만 결과가 아직 준비되지 않았습니다. 자동으로 다시 확인하고 있습니다.'}</div>
      : detail && !detailLoading && detail.status !== 'FINISHED' && <RunProgressStepper status={detail.status} processedCount={detail.progress.processedTestCaseCount} totalCount={detail.testCaseCount} percent={detail.progress.percent} updatedAt={detail.updatedAt} />}
    {autoRefreshStopped && detail && !detailLoading && <div className="rounded-xl border border-[#f0ddb0] bg-[#fff7e8] px-4 py-3 text-xs font-bold text-[#78501b]">자동 갱신이 중단됐습니다. 다시 시도를 눌러주세요.</div>}
    {detailError !== null && detail && !detailLoading && <RequestErrorBanner error={detailError} fallbackMessage="최신 실행 상세를 불러오지 못했습니다." stale={detailStale} onRetry={refreshAll} />}
    {resultsError !== null && !resultsLoading && <RequestErrorBanner error={resultsError} fallbackMessage="Snapshot 결과를 불러오지 못했습니다." stale={hasLoadedResults} onRetry={refreshAll} />}
    {metricsError !== null && !metricsLoading && <RequestErrorBanner error={metricsError} fallbackMessage="판정 지표를 불러오지 못했습니다." stale={loadedMetricsRunId === selectedRunId && evaluatorMetrics !== null} onRetry={refreshAll} />}

    <article className={`overflow-hidden rounded-2xl border ${gateStatus === 'PASS' ? 'border-[#cfe9dc] bg-[#f1faf6]' : gateStatus === 'FAIL' ? 'border-[#f4c7c3] bg-[#fff0ef]' : 'border-[#dfe5e9] bg-[#f6f8f9]'}`}>
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.4fr] lg:p-7">
        <div>
          <div className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black tracking-wide ${gateStatus === 'PASS' ? 'bg-[#d9f2e5] text-[#146c4c]' : gateStatus === 'FAIL' ? 'bg-[#f9d9d6] text-[#a8322d]' : 'bg-[#e7ebee] text-[#586473]'}`}>QUALITY GATE</div>
          <h2 className={`mt-4 text-2xl font-black ${gateStatus === 'PASS' ? 'text-[#146c4c]' : gateStatus === 'FAIL' ? 'text-[#a8322d]' : 'text-[#43515d]'}`}>{gateTitle}</h2>
          <p aria-live="polite" className="mt-2 text-base font-bold text-[#17202a]">{summaryDescription}</p>
          {!notFinished && attentionCount !== null && attentionCount > 0 && <p className="mt-1 text-xs text-[#697586]">판정 불일치 {mismatchCount}건 · 판정 미완료 {incompleteCount}건</p>}
          {metrics ? <>
            <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-black/10 pt-4 text-xs sm:grid-cols-2">
              <QualityGateMetricEvidence metricKey="assertion" metric={metrics.assertion} />
              <QualityGateMetricEvidence metricKey="execution" metric={metrics.execution} />
            </dl>
            {gateFailureReasons.length > 0 && <section aria-labelledby="quality-gate-failure-title" className="mt-3 rounded-xl border border-[#f4c7c3] bg-white/70 p-3 text-xs text-[#8f2f2a]">
              <h3 id="quality-gate-failure-title" className="font-bold">실패 이유</h3>
              <ul className="mt-1 list-disc space-y-1 pl-4">{gateFailureReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </section>}
          </> : <p className="mt-5 border-t border-black/10 pt-4 text-xs text-[#697586]">{!detail
            ? 'Quality Gate 정보를 불러오는 중입니다.'
            : detail.qualityGate?.status === 'NOT_EVALUATED'
              ? '기대 일치 여부를 판정할 수 있는 결과가 없어 Quality Gate 지표를 계산하지 않았습니다.'
              : detail.qualityGate ? 'Quality Gate 지표가 제공되지 않았습니다.' : '실행 종료 후 Quality Gate 지표가 결정됩니다.'}</p>}
        </div>
        <div aria-label="판정 요약" className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="정상 판정" value={normalCount} tone="success" />
          <SummaryMetric label={EVALUATION_OUTCOME_PRESENTATION.FALSE_NEGATIVE.label} value={attentionFacets?.attentionTypes.FALSE_NEGATIVE ?? visibleEvaluatorMetrics?.falseNegative ?? null} tone="danger" onClick={() => selectAttentionTypes(['FALSE_NEGATIVE'])} />
          <SummaryMetric label={EVALUATION_OUTCOME_PRESENTATION.FALSE_POSITIVE.label} value={attentionFacets?.attentionTypes.FALSE_POSITIVE ?? visibleEvaluatorMetrics?.falsePositive ?? null} tone="warning" onClick={() => selectAttentionTypes(['FALSE_POSITIVE'])} />
          <SummaryMetric label="판정 미완료" value={incompleteCount} onClick={() => selectAttentionTypes(['EXECUTION_FAILED', 'TIMED_OUT', 'NOT_STARTED'])} />
        </div>
      </div>
      <p className="border-t border-black/10 px-6 py-3 text-[11px] text-[#697586] lg:px-7">Quality Gate 상태와 지표는 서버 판정을 그대로 표시하며, 현재 결과 페이지에서 다시 계산하지 않습니다.</p>
    </article>

    {detail?.status === 'FINISHED' && !notFinishedRace && !detailLoading && <RunProgressStepper status={detail.status} processedCount={detail.progress.processedTestCaseCount} totalCount={detail.testCaseCount} percent={detail.progress.percent} updatedAt={detail.updatedAt} compact />}

    <article className="overflow-hidden rounded-2xl border border-[#e5e9ee] bg-white">
      <div className="border-b border-[#e5e9ee] p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-sm font-bold">결과 목록</h2><p className="mt-1 text-xs text-[#697586]">판정의 의미를 먼저 보여주며 원본 기술 값은 상세에서 확인할 수 있습니다.</p></div><span className="text-xs font-bold">현재 {visibleResults.length} / 필터 결과 {visiblePageMeta?.totalElements ?? 0}건 {resultsLoading && '· 불러오는 중'}</span></div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="결과 보기 전환">
          <button type="button" aria-pressed={attentionTypes.length > 0} onClick={() => selectAttentionTypes(ATTENTION_TYPES.map(({ type }) => type))} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${attentionTypes.length > 0 ? 'bg-[#17202a] text-white' : 'bg-[#eef1f4] text-[#586473]'}`}>문제만 보기 {attentionFacets ? `(${attentionFacets.attentionTotal})` : ''}</button>
          <button type="button" aria-pressed={attentionTypes.length === 0} onClick={() => selectAttentionTypes([])} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${attentionTypes.length === 0 ? 'bg-[#17202a] text-white' : 'bg-[#eef1f4] text-[#586473]'}`}>전체 보기 {attentionFacets ? `(${attentionFacets.allResults})` : ''}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="확인 필요 유형 필터">
          {ATTENTION_TYPES.map(({ type, label, tone }) => {
            const selectedType = attentionTypes.includes(type);
            const count = attentionFacets?.attentionTypes[type] ?? 0;
            return <button key={type} type="button" aria-pressed={selectedType} onClick={() => toggleAttentionType(type)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${selectedType ? tone : 'border-[#dfe5e9] bg-white text-[#586473]'}`}>{label} {count}</button>;
          })}
        </div>
        <details className="mt-4 rounded-xl bg-[#f8f9fa] p-3 text-xs">
          <summary className="cursor-pointer font-bold text-[#43515d]">고급 필터</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>이름<input value={filters.name} onChange={(event) => { setFilters((current) => ({ ...current, name: event.target.value })); setResultPage(1); }} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5" /></label>
            <label>입력<input value={filters.input} onChange={(event) => { setFilters((current) => ({ ...current, input: event.target.value })); setResultPage(1); }} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5" /></label>
            <label>카테고리<input value={filters.category} onChange={(event) => { setFilters((current) => ({ ...current, category: event.target.value })); setResultPage(1); }} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5" /></label>
            <label>기대 동작<select value={filters.expectedAction} onChange={(event) => { setFilters((current) => ({ ...current, expectedAction: event.target.value as ResultFilters['expectedAction'] })); setResultPage(1); }} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5"><option value="">전체</option><option value="ALLOW">ALLOW</option><option value="BLOCK">BLOCK</option></select></label>
            <label>위험도<select value={filters.severity} onChange={(event) => { setFilters((current) => ({ ...current, severity: event.target.value as ResultFilters['severity'] })); setResultPage(1); }} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5"><option value="">전체</option>{Object.keys(severityPresentation).map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select></label>
            <label>처리 상태<select value={filters.executionStatus} onChange={(event) => { setFilters((current) => ({ ...current, executionStatus: event.target.value as ResultFilters['executionStatus'] })); setResultPage(1); }} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5"><option value="">전체</option><option value="SUCCEEDED">정상 처리</option><option value="FAILED">처리 실패</option><option value="TIMED_OUT">시간 초과</option><option value="NOT_STARTED">미실행</option></select></label>
            <label>기대 일치 여부<select value={filters.assertionStatus} onChange={(event) => { setFilters((current) => ({ ...current, assertionStatus: event.target.value as ResultFilters['assertionStatus'] })); setResultPage(1); }} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5"><option value="">전체</option><option value="PASS">일치 (PASS)</option><option value="FAIL">불일치 (FAIL)</option></select></label>
            <label>판정 유형<select value={filters.evaluationOutcome} onChange={(event) => { setFilters((current) => ({ ...current, evaluationOutcome: event.target.value as OutcomeFilter })); setResultPage(1); }} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5">{OUTCOME_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select></label>
            <label>정렬<select value={filters.sort} onChange={(event) => { setFilters((current) => ({ ...current, sort: event.target.value as ResultFilters['sort'] })); setResultPage(1); }} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5"><option value="">기본 정렬</option><option value="severity,desc">위험도 높은 순</option><option value="severity,asc">위험도 낮은 순</option><option value="name,asc">이름순</option><option value="name,desc">이름 역순</option></select></label>
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_RESULT_FILTERS); setResultPage(1); }} className="mt-3 font-bold text-[#43515d] underline">고급 필터 초기화</button>
        </details>
      </div>
      {attentionTypes.length === 0 && visiblePageMeta && detail && visiblePageMeta.totalElements !== detail.testCaseCount && <div className="border-b border-[#f0ddb0] bg-[#fff7e8] px-5 py-3 text-xs text-[#78501b]">고정 Snapshot 수({detail.testCaseCount})와 결과 수({visiblePageMeta.totalElements})가 일치하지 않습니다. 정상 빈 결과로 처리하지 않습니다.</div>}
      {notFinished
        ? <div className="p-8 text-center text-sm text-[#697586]">실행 완료 후 결과가 표시됩니다.</div>
        : !hasLoadedResults
          ? (resultsLoading ? <div className="p-8 text-center text-sm text-[#697586]">결과를 불러오는 중입니다.</div> : null)
          : visibleResults.length === 0
            ? <div className="p-8 text-center text-sm text-[#697586]">{attentionTypes.length > 0 ? '선택한 확인 필요 유형에 해당하는 결과가 없습니다.' : filters.evaluationOutcome !== 'ALL' ? '이 판정 유형에 해당하는 결과가 없습니다.' : visiblePageMeta && detail && visiblePageMeta.totalElements !== detail.testCaseCount ? '결과 수 불일치를 확인해 주세요.' : '표시할 결과가 없습니다.'}</div>
            : <>
              <div className="divide-y divide-[#e5e9ee] sm:hidden">{visibleResults.map((item) => <div key={item.testCaseSnapshotId} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-[#17202a]">{item.name}</h3><p className="mt-1 text-[11px] text-[#697586]">{item.category} · Snapshot #{item.testCaseSnapshotId}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${severityPresentation[item.severity].className}`}>{severityPresentation[item.severity].label}</span></div>
                <div className="rounded-xl bg-[#f8f9fa] p-3 text-xs"><ResultMeaning item={item} /></div>
                <div className="flex items-end justify-between gap-3"><div><span className="text-[10px] font-bold text-[#697586]">처리 상태</span><b className="mt-0.5 block text-xs text-[#17202a]">{executionLabel(item.executionStatus)}</b>{item.error && <span className="mt-1 block text-[10px] text-[#a8322d]">{errorStageLabel(item.error.stage)} 오류</span>}</div><button type="button" aria-label={`${item.name} 상세 보기`} onClick={() => setSelected(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe5e9] bg-white px-3 py-2 text-xs font-bold text-[#43515d]"><Eye size={14} />보기</button></div>
              </div>)}</div>
              <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-[#f8f9fa] text-[#697586]"><tr><th scope="col" className="px-5 py-3">TestCase</th><th scope="col" className="px-5 py-3">테스트 위험도</th><th scope="col" className="px-5 py-3">결과</th><th scope="col" className="px-5 py-3">처리 상태</th><th scope="col" className="px-5 py-3 text-center">상세</th></tr></thead>
                <tbody className="divide-y divide-[#e5e9ee]">{visibleResults.map((item) => <tr key={item.testCaseSnapshotId} className="hover:bg-[#f1faf6]">
                    <td className="px-5 py-4"><b className="block text-sm text-[#17202a]">{item.name}</b><span className="mt-1 block text-[#697586]">{item.category} · Snapshot #{item.testCaseSnapshotId}</span></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${severityPresentation[item.severity].className}`}>{severityPresentation[item.severity].label}</span></td>
                    <td className="px-5 py-4"><ResultMeaning item={item} /></td>
                    <td className="px-5 py-4"><b className="block text-[#17202a]">{executionLabel(item.executionStatus)}</b>{item.error && <span className="mt-1 block text-[10px] text-[#a8322d]">{errorStageLabel(item.error.stage)} 오류</span>}</td>
                    <td className="px-5 py-4 text-center"><button type="button" aria-label={`${item.name} 상세 보기`} onClick={() => setSelected(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe5e9] bg-white px-3 py-2 font-bold text-[#43515d] hover:border-[#b8c2ca] hover:bg-[#f8f9fa]"><Eye size={14} />보기</button></td>
                  </tr>)}</tbody>
              </table></div>
            </>}
      {visiblePageMeta && visiblePageMeta.totalPages > 1 && <div className="flex items-center justify-between border-t border-[#e5e9ee] p-4 text-xs"><button type="button" disabled={!visiblePageMeta.hasPrevious || resultsLoading} onClick={() => setResultPage((page) => Math.max(1, page - 1))} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">이전</button><span>{visiblePageMeta.number} / {visiblePageMeta.totalPages} 페이지</span><button type="button" disabled={!visiblePageMeta.hasNext || resultsLoading} onClick={() => setResultPage((page) => page + 1)} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">다음</button></div>}
    </article>

    <article className="rounded-2xl border border-[#e5e9ee] bg-white p-5">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div><h2 className="text-sm font-bold">기대·관측 동작 매트릭스</h2><p className="mt-1 text-xs text-[#697586]">기대 동작과 관측된 동작의 관계를 의미 중심으로 보여줍니다.</p></div>
        <span className="text-xs font-bold text-[#43515d]">평가 완료 {evaluatedCount ?? '—'}건</span>
      </div>
      {notFinished
        ? <p className="rounded-xl bg-[#f6f8f9] p-4 text-xs text-[#697586]">실행 완료 후 판정 매트릭스가 표시됩니다.</p>
        : <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-2 text-left">
            <caption className="sr-only">행은 기대 동작, 열은 관측된 동작인 2×2 평가 매트릭스</caption>
            <thead><tr><th scope="col" className="w-[150px] px-3 py-2 text-[11px] font-bold text-[#697586]">기대 동작 ↓</th><th scope="col" className="px-3 py-2 text-xs font-black text-[#43515d]">관측된 동작: 허용</th><th scope="col" className="px-3 py-2 text-xs font-black text-[#43515d]">관측된 동작: 차단</th></tr></thead>
            <tbody>
              <tr><th scope="row" className="rounded-xl bg-[#f8f9fa] px-3 py-4 text-xs font-black text-[#43515d]">허용해야 함<br /><span className="text-[10px] font-medium text-[#697586]">ALLOW</span></th><td><MatrixCell outcome="TRUE_NEGATIVE" count={metricCount(visibleEvaluatorMetrics, 'TRUE_NEGATIVE')} /></td><td><MatrixCell outcome="FALSE_POSITIVE" count={metricCount(visibleEvaluatorMetrics, 'FALSE_POSITIVE')} rate={visibleEvaluatorMetrics?.falsePositiveRate} /></td></tr>
              <tr><th scope="row" className="rounded-xl bg-[#f8f9fa] px-3 py-4 text-xs font-black text-[#43515d]">차단해야 함<br /><span className="text-[10px] font-medium text-[#697586]">BLOCK</span></th><td><MatrixCell outcome="FALSE_NEGATIVE" count={metricCount(visibleEvaluatorMetrics, 'FALSE_NEGATIVE')} rate={visibleEvaluatorMetrics?.falseNegativeRate} /></td><td><MatrixCell outcome="TRUE_POSITIVE" count={metricCount(visibleEvaluatorMetrics, 'TRUE_POSITIVE')} /></td></tr>
            </tbody>
          </table>
        </div>}
      <p className="mt-3 text-[11px] text-[#697586]">실행 실패나 관측된 동작이 없는 결과는 매트릭스에 포함되지 않습니다. 현재 테스트 케이스의 기대 동작을 기준으로 한 분류입니다.</p>
    </article>

    <article className="rounded-2xl border border-[#e5e9ee] bg-white p-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">실행·평가 정보</h2><div className="flex gap-2">{detail?.executionOutcome ? <StatusPill kind="execution" status={detail.executionOutcome} /> : <span className="rounded-full bg-[#eef1f4] px-2.5 py-1 text-[10px] font-extrabold text-[#8fa0ad]">결정 전</span>}<StatusPill kind="gate" status={gateStatus} /></div></div>
      <dl className="grid gap-4 text-xs sm:grid-cols-2">
        <div><dt className="text-[#697586]">Application</dt><dd className="mt-1 break-all font-bold">{detail?.target.identifier ?? '—'}</dd><dd className="mt-1 text-[#697586]">Model: {detail?.target.model ?? '—'}</dd><dd className="mt-1 text-[#697586]">Revision: {detail?.target.revision ?? '없음'}</dd></div>
      </dl>
    </article>

    {selected && createPortal(<div className={`fixed inset-0 ${LAYER_CLASS.dialog} flex items-center justify-center bg-black/40 p-4`}><button type="button" className="absolute inset-0 cursor-default" tabIndex={-1} aria-hidden="true" onClick={closeResultDialog} /><section ref={resultDialogRef} role="dialog" aria-modal="true" aria-labelledby="result-dialog-title" tabIndex={-1} className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="flex justify-between gap-4"><div><h2 id="result-dialog-title" className="text-lg font-bold">{selected.name}</h2><p className="text-xs text-[#697586]">Snapshot #{selected.testCaseSnapshotId}</p></div><button type="button" aria-label="Snapshot 결과 상세 창 닫기" onClick={closeResultDialog}><X size={20} /></button></div>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div className="sm:col-span-2"><dt className="text-xs font-bold text-[#697586]">입력</dt><dd className="mt-1 rounded-xl bg-[#f6f8f9] p-3 whitespace-pre-wrap">{selected.input}</dd></div><div><dt className="text-xs font-bold text-[#697586]">대상 애플리케이션 실행</dt><dd className="mt-1">{executionLabel(selected.executionStatus)}</dd></div><div><dt className="text-xs font-bold text-[#697586]">기대 동작</dt><dd className="mt-1 font-mono">{selected.expectedAction}</dd></div><div><dt className="text-xs font-bold text-[#697586]">관측된 동작</dt><dd className="mt-1 font-mono">{selected.evaluatorVerdict ?? '없음'}</dd></div><div><dt className="text-xs font-bold text-[#697586]">기대 일치 여부</dt><dd className="mt-1">{selected.assertionStatus === 'PASS' ? '일치 (PASS)' : selected.assertionStatus === 'FAIL' ? '불일치 (FAIL)' : '평가되지 않음'}</dd></div><div><dt className="text-xs font-bold text-[#697586]">판정 유형</dt><dd className="mt-1">{evaluationOutcomeLabel(selected.evaluationOutcome)}</dd></div>{selected.error && <div className="sm:col-span-2 rounded-xl border border-[#f4c7c3] bg-[#fff0ef] p-3"><dt className="text-xs font-bold">{errorStageLabel(selected.error.stage)} 오류 · {selected.error.code}</dt><dd className="mt-1 text-xs">{selected.error.message}</dd></div>}</dl>
      <p className="mt-6 text-xs text-[#697586]">Application 자연어 응답은 보안 정책에 따라 표시하지 않습니다.</p></section></div>, document.body)}
  </section>;
};
