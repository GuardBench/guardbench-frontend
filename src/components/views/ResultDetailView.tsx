import React, { useEffect, useState } from 'react';
import { AlertCircle, Eye, Loader2, RefreshCw, X } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import {
  getTestRunEvaluatorMetrics,
  getTestRunResults,
  type EvaluationOutcome,
  type EvaluatorMetricsRes,
  type TestRunResultListItemRes,
  type PageMetaRes,
} from '../../services/testRunService';
import { useLiveRunProgress } from '../../hooks/useLiveRunProgress';
import { RequestErrorBanner } from '../common/RequestErrorBanner';
import { StatusPill } from '../common/StatusPill';

interface ResultDetailViewProps {
  selectedRunId?: string;
  onGoNewRun: () => void;
}

const executionLabel = (status: TestRunResultListItemRes['executionStatus']) => ({
  SUCCEEDED: '정상 처리', FAILED: '실패', TIMED_OUT: '시간 초과', NOT_STARTED: '미시작',
}[status]);

const outcomeLabel = (outcome: TestRunResultListItemRes['evaluationOutcome']) => outcome
  ? ({
    TRUE_POSITIVE: 'True Positive', TRUE_NEGATIVE: 'True Negative',
    FALSE_POSITIVE: 'False Positive', FALSE_NEGATIVE: 'False Negative',
  }[outcome])
  : '평가되지 않음';

const errorStageLabel = (stage: NonNullable<TestRunResultListItemRes['error']>['stage']) => (
  stage === 'APPLICATION_TARGET' ? 'Application 실행' : 'Evaluator 평가'
);

type OutcomeFilter = 'ALL' | EvaluationOutcome;

const OUTCOME_FILTERS: Array<{ value: OutcomeFilter; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'FALSE_NEGATIVE', label: 'False Negative' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'TRUE_POSITIVE', label: 'True Positive' },
  { value: 'TRUE_NEGATIVE', label: 'True Negative' },
];

const rateLabel = (rate: number | null) => rate === null ? '분모 없음' : `${(rate * 100).toFixed(1)}%`;

export const ResultDetailView: React.FC<ResultDetailViewProps> = ({ selectedRunId, onGoNewRun }) => {
  const [results, setResults] = useState<TestRunResultListItemRes[]>([]);
  const [resultPage, setResultPage] = useState(1);
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('ALL');
  const [pageMeta, setPageMeta] = useState<PageMetaRes | null>(null);
  const [evaluatorMetrics, setEvaluatorMetrics] = useState<EvaluatorMetricsRes | null>(null);
  const [selected, setSelected] = useState<TestRunResultListItemRes | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [notFinishedRace, setNotFinishedRace] = useState(false);
  const [resultsError, setResultsError] = useState<unknown>(null);
  const [metricsError, setMetricsError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const {
    detail,
    error: detailError,
    stale: detailStale,
    isLoading: detailLoading,
    refresh: refreshDetail,
  } = useLiveRunProgress({ runId: selectedRunId ?? null });

  const refreshAll = () => {
    setNotFinishedRace(false);
    refreshDetail();
    setReloadToken((value) => value + 1);
  };

  useEffect(() => {
    if (!selectedRunId || detail?.status !== 'FINISHED') return;
    let active = true;
    const loadResults = async () => {
      setResultsLoading(true);
      setResultsError(null);
      try {
        const nextResults = await getTestRunResults(selectedRunId, {
          page: resultPage,
          size: 100,
          ...(outcomeFilter === 'ALL' ? {} : { evaluationOutcome: outcomeFilter }),
        });
        if (active) {
          setResults(nextResults.items);
          setPageMeta(nextResults.page);
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.code === 'TEST_RUN_NOT_FINISHED') {
          setNotFinishedRace(true);
          setResults([]);
          setPageMeta(null);
        } else {
          setResultsError(error);
        }
      } finally {
        if (active) setResultsLoading(false);
      }
    };
    loadResults();
    return () => { active = false; };
  }, [selectedRunId, reloadToken, detail?.status, resultPage, outcomeFilter]);

  useEffect(() => {
    if (!selectedRunId || detail?.status !== 'FINISHED') return;
    let active = true;
    const loadMetrics = async () => {
      setMetricsLoading(true);
      setMetricsError(null);
      try {
        const nextMetrics = await getTestRunEvaluatorMetrics(selectedRunId);
        if (active) setEvaluatorMetrics(nextMetrics);
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.code === 'TEST_RUN_NOT_FINISHED') {
          setNotFinishedRace(true);
        } else {
          setMetricsError(error);
        }
      } finally {
        if (active) setMetricsLoading(false);
      }
    };
    loadMetrics();
    return () => { active = false; };
  }, [selectedRunId, reloadToken, detail?.status]);

  const notFinished = detail?.status !== 'FINISHED' || notFinishedRace;

  if (!detailLoading && detailError && !detail) {
    return <section className="space-y-6 animate-rise">
      <h1 className="text-3xl font-extrabold text-[#17202a]">테스트 결과 상세</h1>
      <RequestErrorBanner error={detailError} fallbackMessage="테스트 실행 상세를 불러오지 못했습니다." onRetry={refreshAll} />
    </section>;
  }

  const gateStatus = detail?.qualityGate?.status ?? 'NOT_EVALUATED_BEFORE_FINISH';
  const gateTitle = gateStatus === 'PASS' ? 'Quality Gate 통과'
    : gateStatus === 'FAIL' ? 'Quality Gate 실패'
      : gateStatus === 'NOT_EVALUATED' ? 'Quality Gate 평가 불가' : 'Quality Gate 평가 전';
  const metrics = detail?.qualityGate?.metrics;
  const evaluatedCount = evaluatorMetrics
    ? evaluatorMetrics.truePositive + evaluatorMetrics.trueNegative + evaluatorMetrics.falsePositive + evaluatorMetrics.falseNegative
    : null;

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
        <button type="button" onClick={refreshAll} disabled={detailLoading} className="inline-flex items-center gap-2 rounded-xl border border-[#e5e9ee] bg-white px-4 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw size={14} />새로고침</button>
        <button type="button" onClick={onGoNewRun} className="rounded-xl bg-[#17202a] px-4 py-2 text-xs font-bold text-white">다시 실행</button>
      </div>
    </header>

    {notFinished && !detailLoading && <div className="flex items-center gap-2 rounded-xl border border-[#f0ddb0] bg-[#fff7e8] px-4 py-3 text-xs text-[#78501b]"><AlertCircle size={14} />실행이 아직 완료되지 않았습니다 ({detail?.status}, {detail?.progress.percent.toFixed(0)}%).</div>}
    {detailError !== null && detail && !detailLoading && <RequestErrorBanner error={detailError} fallbackMessage="최신 실행 상세를 불러오지 못했습니다." stale={detailStale} onRetry={refreshAll} />}
    {resultsError !== null && !resultsLoading && <RequestErrorBanner error={resultsError} fallbackMessage="Snapshot 결과를 불러오지 못했습니다." stale={results.length > 0} onRetry={refreshAll} />}
    {metricsError !== null && !metricsLoading && <RequestErrorBanner error={metricsError} fallbackMessage="Evaluator 지표를 불러오지 못했습니다." stale={evaluatorMetrics !== null} onRetry={refreshAll} />}

    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <article className={`rounded-2xl p-6 text-white ${gateStatus === 'PASS' ? 'bg-[#1a7f5a]' : gateStatus === 'FAIL' ? 'bg-[#a63b36]' : 'bg-[#687684]'}`}>
        <small className="font-bold opacity-80">QUALITY GATE</small><h2 className="my-4 text-2xl font-black">{gateTitle}</h2>
        <p className="text-xs opacity-90">{metrics ? '현재 Run의 Assertion 집계 지표가 저장돼 있습니다.' : '표시할 확정 지표가 없습니다.'}</p>
      </article>
      <article className="rounded-2xl border border-[#e5e9ee] bg-white p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">실행 정보</h2><div className="flex gap-2">{detail?.executionOutcome ? <StatusPill kind="execution" status={detail.executionOutcome} /> : <span className="rounded-full bg-[#eef1f4] px-2.5 py-1 text-[10px] font-extrabold text-[#8fa0ad]">결정 전</span>}<StatusPill kind="gate" status={gateStatus} /></div></div>
        <dl className="grid gap-4 text-xs sm:grid-cols-2">
          <div><dt className="text-[#697586]">Application</dt><dd className="mt-1 break-all font-bold">{detail?.target.identifier ?? '—'}</dd><dd className="mt-1 text-[#697586]">Revision: {detail?.target.revision ?? '없음'}</dd></div>
          <div><dt className="text-[#697586]">Evaluation Profile</dt><dd className="mt-1 font-bold">{detail?.evaluationProfile.checks.join(', ') ?? '—'}</dd><dd className="mt-1 text-[#697586]">Strictness: {detail?.evaluationProfile.strictness ?? '—'}</dd></div>
        </dl>
      </article>
    </div>

    <article className="rounded-2xl border border-[#e5e9ee] bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-sm font-bold">Evaluator Review</h2><p className="mt-1 text-xs text-[#697586]">현재 Evaluation Profile에서 Expected와 Evaluator Verdict의 일치 관계를 분석합니다.</p></div><span className="text-xs font-bold">분류 집계 대상 {evaluatedCount ?? '—'}건</span></div>
      {notFinished ? <p className="rounded-xl bg-[#f6f8f9] p-4 text-xs text-[#697586]">실행 완료 후 Evaluator 지표가 표시됩니다.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-[#f6f8f9] p-4"><span className="text-[10px] font-bold text-[#697586]">True Positive</span><b className="mt-1 block text-xl">{evaluatorMetrics?.truePositive ?? '—'}</b></div>
        <div className="rounded-xl bg-[#f6f8f9] p-4"><span className="text-[10px] font-bold text-[#697586]">True Negative</span><b className="mt-1 block text-xl">{evaluatorMetrics?.trueNegative ?? '—'}</b></div>
        <div className="rounded-xl bg-[#fff7e8] p-4"><span className="text-[10px] font-bold text-[#78501b]">False Positive</span><b className="mt-1 block text-xl text-[#a56512]">{evaluatorMetrics?.falsePositive ?? '—'}</b><span className="text-[10px] text-[#78501b]">비율 {evaluatorMetrics ? rateLabel(evaluatorMetrics.falsePositiveRate) : '—'}</span></div>
        <div className="rounded-xl bg-[#fff0ef] p-4"><span className="text-[10px] font-bold text-[#8f2925]">False Negative</span><b className="mt-1 block text-xl text-[#bd3b35]">{evaluatorMetrics?.falseNegative ?? '—'}</b><span className="text-[10px] text-[#8f2925]">비율 {evaluatorMetrics ? rateLabel(evaluatorMetrics.falseNegativeRate) : '—'}</span></div>
      </div>}
      <p className="mt-3 text-[11px] text-[#697586]">실행 실패나 Evaluator verdict가 없는 결과는 이 분류 집계에 포함되지 않습니다. 이는 모델의 보편적 정확도가 아니라 현재 TestCase Expected 기준입니다.</p>
    </article>

    <article className="overflow-hidden rounded-2xl border border-[#e5e9ee] bg-white">
      <div className="border-b border-[#e5e9ee] p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="text-sm font-bold">Snapshot별 평가 결과</h2><p className="mt-1 text-xs text-[#697586]">Application 실행, Evaluator verdict, Expected와 Assertion을 서로 다른 축으로 표시합니다.</p></div><span className="text-xs font-bold">현재 {results.length} / 필터 결과 {pageMeta?.totalElements ?? 0}건 {resultsLoading && '· 불러오는 중'}</span></div><div className="mt-4 flex flex-wrap gap-2">{OUTCOME_FILTERS.map((filter) => <button key={filter.value} type="button" aria-pressed={outcomeFilter === filter.value} onClick={() => { setOutcomeFilter(filter.value); setResultPage(1); }} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${outcomeFilter === filter.value ? 'bg-[#17202a] text-white' : 'bg-[#eef1f4] text-[#586473]'}`}>{filter.label}</button>)}</div></div>
      {outcomeFilter === 'ALL' && pageMeta && detail && pageMeta.totalElements !== detail.testCaseCount && <div className="border-b border-[#f0ddb0] bg-[#fff7e8] px-5 py-3 text-xs text-[#78501b]">고정 Snapshot 수({detail.testCaseCount})와 결과 수({pageMeta.totalElements})가 일치하지 않습니다. 정상 빈 결과로 처리하지 않습니다.</div>}
      {results.length === 0 ? <div className="p-8 text-center text-sm text-[#697586]">{notFinished ? '실행 완료 후 결과가 표시됩니다.' : outcomeFilter !== 'ALL' ? '이 분류에 해당하는 결과가 없습니다.' : pageMeta && detail && pageMeta.totalElements !== detail.testCaseCount ? '결과 수 불일치를 확인해 주세요.' : '표시할 결과가 없습니다.'}</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#f8f9fa] text-[#697586]"><tr><th className="px-5 py-3">TestCase</th><th className="px-5 py-3">Application</th><th className="px-5 py-3">Evaluator Verdict</th><th className="px-5 py-3">Expected</th><th className="px-5 py-3">Assertion</th><th className="px-5 py-3">Outcome</th><th className="px-5 py-3">상세</th></tr></thead>
        <tbody className="divide-y divide-[#e5e9ee]">{results.map((item) => <tr key={item.testCaseSnapshotId} className="hover:bg-[#f1faf6]"><td className="px-5 py-4"><b className="block text-sm">{item.name}</b><span className="text-[#697586]">{item.category} · #{item.testCaseSnapshotId} · {item.severity}</span></td><td className="px-5 py-4 font-bold">{executionLabel(item.executionStatus)}</td><td className="px-5 py-4 font-mono font-bold">{item.evaluatorVerdict ?? '없음'}</td><td className="px-5 py-4 font-mono font-bold">{item.expectedAction}</td><td className="px-5 py-4"><StatusPill kind="assertion" status={item.assertionStatus ?? 'NONE'} /></td><td className="px-5 py-4">{outcomeLabel(item.evaluationOutcome)}</td><td className="px-5 py-4"><button type="button" aria-label={`${item.name} 상세 보기`} onClick={() => setSelected(item)} className="rounded-lg p-2 text-[#697586] hover:bg-white"><Eye size={16} /></button></td></tr>)}</tbody>
      </table></div>}
      {pageMeta && pageMeta.totalPages > 1 && <div className="flex items-center justify-between border-t border-[#e5e9ee] p-4 text-xs"><button type="button" disabled={!pageMeta.hasPrevious || resultsLoading} onClick={() => setResultPage((page) => Math.max(1, page - 1))} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">이전</button><span>{pageMeta.number} / {pageMeta.totalPages} 페이지</span><button type="button" disabled={!pageMeta.hasNext || resultsLoading} onClick={() => setResultPage((page) => page + 1)} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">다음</button></div>}
    </article>

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="result-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="flex justify-between gap-4"><div><h2 id="result-dialog-title" className="text-lg font-bold">{selected.name}</h2><p className="text-xs text-[#697586]">Snapshot #{selected.testCaseSnapshotId}</p></div><button type="button" aria-label="닫기" onClick={() => setSelected(null)}><X size={20} /></button></div>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div className="sm:col-span-2"><dt className="text-xs font-bold text-[#697586]">Input</dt><dd className="mt-1 rounded-xl bg-[#f6f8f9] p-3 whitespace-pre-wrap">{selected.input}</dd></div><div><dt className="text-xs font-bold text-[#697586]">Application 실행</dt><dd className="mt-1">{executionLabel(selected.executionStatus)}</dd></div><div><dt className="text-xs font-bold text-[#697586]">Evaluator Verdict</dt><dd className="mt-1 font-mono">{selected.evaluatorVerdict ?? '없음'}</dd></div><div><dt className="text-xs font-bold text-[#697586]">Expected</dt><dd className="mt-1 font-mono">{selected.expectedAction}</dd></div><div><dt className="text-xs font-bold text-[#697586]">Assertion / Outcome</dt><dd className="mt-1">{selected.assertionStatus ?? '평가되지 않음'} · {outcomeLabel(selected.evaluationOutcome)}</dd></div>{selected.error && <div className="sm:col-span-2 rounded-xl border border-[#f4c7c3] bg-[#fff0ef] p-3"><dt className="text-xs font-bold">{errorStageLabel(selected.error.stage)} 오류 · {selected.error.code}</dt><dd className="mt-1 text-xs">{selected.error.message}</dd></div>}</dl>
      <p className="mt-6 text-xs text-[#697586]">Application 자연어 응답은 보안 정책에 따라 표시하지 않습니다.</p></section></div>}
  </section>;
};
