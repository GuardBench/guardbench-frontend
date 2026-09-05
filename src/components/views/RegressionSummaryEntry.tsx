import { ArrowRight, GitCompareArrows, Loader2 } from 'lucide-react';
import type { RegressionComparisonState } from '../../hooks/useRegressionComparison';
import { RequestErrorBanner } from '../common/RequestErrorBanner';
import { regressionSummaryItems } from './regressionSummary';

interface RegressionSummaryEntryProps {
  runId: string;
  regression: RegressionComparisonState;
  onOpenDetail: () => void;
}

export function RegressionSummaryEntry({ runId, regression, onOpenDetail }: RegressionSummaryEntryProps) {
  const {
    candidates,
    candidatesLoading,
    candidatesError,
    comparison,
    comparisonLoading,
    comparisonError,
    hasLoadedCandidates,
    notFinished,
    selectedCandidate,
    selectedAutomatically,
    refresh,
  } = regression;
  const summaryItems = comparison ? regressionSummaryItems(comparison) : [];
  const loading = candidatesLoading || comparisonLoading;

  return (
    <section className="rounded-2xl border border-[#dbe8e2] bg-[#f4fbf8] p-5 shadow-[0_3px_15px_rgba(17,31,44,0.02)] sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1a7f5a]">
            <GitCompareArrows size={14} /> Regression
          </div>
          <h2 className="text-base font-extrabold text-[#17202a]">과거 Run 대비 변화 확인</h2>
          {candidatesLoading && (
            <p className="mt-2 flex items-center gap-2 text-xs text-[#697586]">
              <Loader2 size={13} className="animate-spin" /> 비교 가능한 과거 Run을 확인하고 있습니다.
            </p>
          )}
          {!candidatesLoading && comparisonLoading && (
            <p className="mt-2 flex items-center gap-2 text-xs text-[#697586]">
              <Loader2 size={13} className="animate-spin" /> 선택한 Run과의 변화 요약을 불러오고 있습니다.
            </p>
          )}
          {!loading && notFinished && (
            <p className="mt-2 text-xs text-[#78501b]">현재 Run이 종료되면 비교 가능한 과거 Run을 자동으로 확인합니다.</p>
          )}
          {!loading && !notFinished && hasLoadedCandidates && candidates.length === 0 && (
            <p className="mt-2 text-xs text-[#697586]">현재 비교 가능한 과거 Run이 없습니다.</p>
          )}
          {!loading && selectedCandidate && comparison && (
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

        <button
          type="button"
          onClick={onOpenDetail}
          disabled={!runId || candidates.length === 0 || notFinished}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17202a] px-4 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-[#25313d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          회귀 상세 보기 <ArrowRight size={14} />
        </button>
      </div>

      {(candidatesError !== null || comparisonError !== null) && !loading && (
        <div className="mt-4">
          <RequestErrorBanner
            error={candidatesError ?? comparisonError}
            fallbackMessage={candidatesError !== null
              ? '비교 가능한 과거 Run을 불러오지 못했습니다.'
              : '선택한 Run과의 Regression 요약을 불러오지 못했습니다.'}
            onRetry={refresh}
          />
        </div>
      )}
    </section>
  );
}
