import React, { useEffect, useState } from 'react';
import { AlertCircle, Eye, Loader2, RefreshCw, X } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import {
  getTestRunDetail,
  getTestRunResults,
  type TestRunDetailRes,
  type TestRunResultListItemRes,
} from '../../services/testRunService';
import { RequestErrorBanner } from '../common/RequestErrorBanner';
import { StatusPill } from '../common/StatusPill';

interface ResultDetailViewProps {
  selectedRunId?: string;
  onGoNewRun: () => void;
  onNotify: (msg: string) => void;
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

export const ResultDetailView: React.FC<ResultDetailViewProps> = ({ selectedRunId, onGoNewRun }) => {
  const [detail, setDetail] = useState<TestRunDetailRes | null>(null);
  const [results, setResults] = useState<TestRunResultListItemRes[]>([]);
  const [selected, setSelected] = useState<TestRunResultListItemRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFinished, setNotFinished] = useState(false);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [resultsError, setResultsError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!selectedRunId) return;
      setLoading(true);
      setNotFinished(false);
      setDetailError(null);
      setResultsError(null);
      try {
        const nextDetail = await getTestRunDetail(selectedRunId);
        if (!active) return;
        setDetail(nextDetail);
        if (nextDetail.status !== 'FINISHED') {
          setNotFinished(true);
          setResults([]);
          return;
        }
        try {
          const nextResults = await getTestRunResults(selectedRunId, { size: 100 });
          if (active) setResults(nextResults.items);
        } catch (error) {
          if (!active) return;
          if (error instanceof ApiError && error.code === 'TEST_RUN_NOT_FINISHED') {
            setNotFinished(true);
            setResults([]);
          } else {
            setResultsError(error);
          }
        }
      } catch (error) {
        if (active) setDetailError(error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [selectedRunId, reloadToken]);

  if (!loading && detailError && !detail) {
    return <section className="space-y-6 animate-rise">
      <h1 className="text-3xl font-extrabold text-[#17202a]">테스트 결과 상세</h1>
      <RequestErrorBanner error={detailError} fallbackMessage="테스트 실행 상세를 불러오지 못했습니다." onRetry={() => setReloadToken((value) => value + 1)} />
    </section>;
  }

  const gateStatus = detail?.qualityGate?.status ?? 'NOT_EVALUATED_BEFORE_FINISH';
  const gateTitle = gateStatus === 'PASS' ? 'Quality Gate 통과'
    : gateStatus === 'FAIL' ? 'Quality Gate 실패'
      : gateStatus === 'NOT_EVALUATED' ? 'Quality Gate 평가 불가' : 'Quality Gate 평가 전';
  const metrics = detail?.qualityGate?.metrics;

  return <section className="space-y-6 animate-rise">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1a7f5a]">
          <span>Run #{detail?.id ?? selectedRunId ?? '—'}</span><StatusPill kind="progress" status={detail?.status ?? 'QUEUED'} />
          {loading && <Loader2 size={13} className="animate-spin" />}
        </div>
        <h1 className="text-2xl font-extrabold text-[#17202a] sm:text-3xl">테스트 결과 상세</h1>
        <p className="mt-1.5 text-sm text-[#697586]">Suite #{detail?.testSuiteId ?? '—'} · {detail?.testCaseCount ?? 0} snapshots</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setReloadToken((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#e5e9ee] bg-white px-4 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw size={14} />새로고침</button>
        <button type="button" onClick={onGoNewRun} className="rounded-xl bg-[#17202a] px-4 py-2 text-xs font-bold text-white">다시 실행</button>
      </div>
    </header>

    {notFinished && !loading && <div className="flex items-center gap-2 rounded-xl border border-[#f0ddb0] bg-[#fff7e8] px-4 py-3 text-xs text-[#78501b]"><AlertCircle size={14} />실행이 아직 완료되지 않았습니다 ({detail?.status}, {detail?.progress.percent.toFixed(0)}%).</div>}
    {detailError !== null && detail && !loading && <RequestErrorBanner error={detailError} fallbackMessage="최신 실행 상세를 불러오지 못했습니다." stale onRetry={() => setReloadToken((value) => value + 1)} />}
    {resultsError !== null && !loading && <RequestErrorBanner error={resultsError} fallbackMessage="Snapshot 결과를 불러오지 못했습니다." stale={results.length > 0} onRetry={() => setReloadToken((value) => value + 1)} />}

    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <article className={`rounded-2xl p-6 text-white ${gateStatus === 'PASS' ? 'bg-[#1a7f5a]' : gateStatus === 'FAIL' ? 'bg-[#a63b36]' : 'bg-[#687684]'}`}>
        <small className="font-bold opacity-80">QUALITY GATE</small><h2 className="my-4 text-2xl font-black">{gateTitle}</h2>
        <p className="text-xs opacity-90">{metrics ? '현재 Run의 Assertion 집계 지표가 저장돼 있습니다.' : '표시할 확정 지표가 없습니다.'}</p>
      </article>
      <article className="rounded-2xl border border-[#e5e9ee] bg-white p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">실행 정보</h2><div className="flex gap-2"><StatusPill kind="execution" status={detail?.executionOutcome ?? null} /><StatusPill kind="gate" status={gateStatus} /></div></div>
        <dl className="grid gap-4 text-xs sm:grid-cols-2">
          <div><dt className="text-[#697586]">Application</dt><dd className="mt-1 break-all font-bold">{detail?.target.identifier ?? '—'}</dd><dd className="mt-1 text-[#697586]">Revision: {detail?.target.revision ?? '없음'}</dd></div>
          <div><dt className="text-[#697586]">Evaluation Profile</dt><dd className="mt-1 font-bold">{detail?.evaluationProfile.checks.join(', ') ?? '—'}</dd><dd className="mt-1 text-[#697586]">Strictness: {detail?.evaluationProfile.strictness ?? '—'}</dd></div>
        </dl>
      </article>
    </div>

    <article className="overflow-hidden rounded-2xl border border-[#e5e9ee] bg-white">
      <div className="flex items-center justify-between border-b border-[#e5e9ee] p-5"><div><h2 className="text-sm font-bold">Snapshot별 평가 결과</h2><p className="mt-1 text-xs text-[#697586]">Application 실행, Evaluator verdict, Expected와 Assertion을 서로 다른 축으로 표시합니다.</p></div><span className="text-xs font-bold">{results.length}건</span></div>
      {results.length === 0 ? <div className="p-8 text-center text-sm text-[#697586]">{notFinished ? '실행 완료 후 결과가 표시됩니다.' : '표시할 결과가 없습니다.'}</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#f8f9fa] text-[#697586]"><tr><th className="px-5 py-3">TestCase</th><th className="px-5 py-3">Application</th><th className="px-5 py-3">Evaluator Verdict</th><th className="px-5 py-3">Expected</th><th className="px-5 py-3">Assertion</th><th className="px-5 py-3">Outcome</th><th className="px-5 py-3">상세</th></tr></thead>
        <tbody className="divide-y divide-[#e5e9ee]">{results.map((item) => <tr key={item.testCaseSnapshotId} className="hover:bg-[#f1faf6]"><td className="px-5 py-4"><b className="block text-sm">{item.name}</b><span className="text-[#697586]">{item.category} · #{item.testCaseSnapshotId} · {item.severity}</span></td><td className="px-5 py-4 font-bold">{executionLabel(item.executionStatus)}</td><td className="px-5 py-4 font-mono font-bold">{item.evaluatorVerdict ?? '없음'}</td><td className="px-5 py-4 font-mono font-bold">{item.expectedAction}</td><td className="px-5 py-4"><StatusPill kind="assertion" status={item.assertionStatus ?? 'NONE'} /></td><td className="px-5 py-4">{outcomeLabel(item.evaluationOutcome)}</td><td className="px-5 py-4"><button type="button" aria-label={`${item.name} 상세 보기`} onClick={() => setSelected(item)} className="rounded-lg p-2 text-[#697586] hover:bg-white"><Eye size={16} /></button></td></tr>)}</tbody>
      </table></div>}
    </article>

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="result-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="flex justify-between gap-4"><div><h2 id="result-dialog-title" className="text-lg font-bold">{selected.name}</h2><p className="text-xs text-[#697586]">Snapshot #{selected.testCaseSnapshotId}</p></div><button type="button" aria-label="닫기" onClick={() => setSelected(null)}><X size={20} /></button></div>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div className="sm:col-span-2"><dt className="text-xs font-bold text-[#697586]">Input</dt><dd className="mt-1 rounded-xl bg-[#f6f8f9] p-3 whitespace-pre-wrap">{selected.input}</dd></div><div><dt className="text-xs font-bold text-[#697586]">Application 실행</dt><dd className="mt-1">{executionLabel(selected.executionStatus)}</dd></div><div><dt className="text-xs font-bold text-[#697586]">Evaluator Verdict</dt><dd className="mt-1 font-mono">{selected.evaluatorVerdict ?? '없음'}</dd></div><div><dt className="text-xs font-bold text-[#697586]">Expected</dt><dd className="mt-1 font-mono">{selected.expectedAction}</dd></div><div><dt className="text-xs font-bold text-[#697586]">Assertion / Outcome</dt><dd className="mt-1">{selected.assertionStatus ?? '평가되지 않음'} · {outcomeLabel(selected.evaluationOutcome)}</dd></div>{selected.error && <div className="sm:col-span-2 rounded-xl border border-[#f4c7c3] bg-[#fff0ef] p-3"><dt className="text-xs font-bold">{selected.error.stage} 오류 · {selected.error.code}</dt><dd className="mt-1 text-xs">{selected.error.message}</dd></div>}</dl>
      <p className="mt-6 text-xs text-[#697586]">Application 자연어 응답은 보안 정책에 따라 표시하지 않습니다.</p></section></div>}
  </section>;
};
