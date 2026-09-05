import { ArrowRight, GitCompareArrows, Loader2 } from 'lucide-react';
import type { RegressionSummaryState } from '../../hooks/useRegressionComparison';
import { RequestErrorBanner } from '../common/RequestErrorBanner';
import { regressionSummaryItems } from './regressionSummary';

interface RegressionSummaryEntryProps {
  regression: RegressionSummaryState;
  onOpenDetail: () => void;
}

export function RegressionSummaryEntry({ regression, onOpenDetail }: RegressionSummaryEntryProps) {
  const {
    runId,
    summary,
    loading,
    error,
    hasLoadedCandidates,
    hasComparableRun,
    notFinished,
    autoRetryExhausted,
    selectedCandidate,
    selectedAutomatically,
    retry,
  } = regression;
  const summaryItems = summary ? regressionSummaryItems(summary) : [];

  return (
    <section className="rounded-2xl border border-[#dbe8e2] bg-[#f4fbf8] p-5 shadow-[0_3px_15px_rgba(17,31,44,0.02)] sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1a7f5a]">
            <GitCompareArrows size={14} /> Regression
          </div>
          <h2 className="text-base font-extrabold text-[#17202a]">과거 Run 대비 변화 확인</h2>
          <div aria-live="polite">
            {loading && !selectedCandidate && (
              <p className="mt-2 flex items-center gap-2 text-xs text-[#697586]">
                <Loader2 size={13} className="animate-spin" /> 비교 가능한 과거 Run을 확인하고 있습니다.
              </p>
            )}
            {loading && selectedCandidate && (
              <p className="mt-2 flex items-center gap-2 text-xs text-[#697586]">
                <Loader2 size={13} className="animate-spin" /> 선택한 Run과의 변화 요약을 불러오고 있습니다.
              </p>
            )}
            {!loading && notFinished && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#78501b]">
                <p>{autoRetryExhausted
                  ? '자동 확인을 5회 마쳤습니다. Run 상태를 확인한 뒤 다시 시도해 주세요.'
                  : '현재 Run이 종료되면 비교 가능한 과거 Run을 자동으로 확인합니다.'}</p>
                {autoRetryExhausted && (
                  <button
                    type="button"
                    onClick={retry}
                    className="rounded-lg border border-[#d8bd78] bg-white px-2.5 py-1 font-bold hover:bg-[#fffaf0]"
                  >
                    다시 시도
                  </button>
                )}
              </div>
            )}
            {!loading && !notFinished && hasLoadedCandidates && !hasComparableRun && (
              <p className="mt-2 text-xs text-[#697586]">현재 비교 가능한 과거 Run이 없습니다.</p>
            )}
            {!loading && selectedCandidate && summary && (
              <div className="mt-3">
                <p className="text-xs font-extrabold text-[#17202a]">
                  Run #{selectedCandidate.id} 대비
                  {selectedAutomatically && <span className="ml-2 rounded-full bg-[#dcefe6] px-2 py-0.5 text-[10px] text-[#146c4c]">자동 선택</span>}
                </p>
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {summaryItems.map((item) => (
                    <div key={item.label} className="flex gap-1">
                      <dt className="font-bold text-[#697586]">{item.label}</dt>
                      <dd className="font-black text-[#17202a]">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDetail}
          disabled={!runId || !hasComparableRun || notFinished}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17202a] px-4 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-[#25313d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          회귀 상세 보기 <ArrowRight size={14} />
        </button>
      </div>

      {error !== null && !loading && (
        <div className="mt-4">
          <RequestErrorBanner
            error={error}
            fallbackMessage="Regression 요약을 불러오지 못했습니다."
            onRetry={retry}
          />
        </div>
      )}
    </section>
  );
}
