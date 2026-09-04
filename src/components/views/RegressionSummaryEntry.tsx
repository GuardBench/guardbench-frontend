import { useEffect, useState } from 'react';
import { ArrowRight, GitCompareArrows, Loader2 } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import { getComparableTestRuns } from '../../services/regressionService';
import { RequestErrorBanner } from '../common/RequestErrorBanner';

interface RegressionSummaryEntryProps {
  runId: string;
  onOpenDetail: () => void;
}

export function RegressionSummaryEntry({ runId, onOpenDetail }: RegressionSummaryEntryProps) {
  const [totalComparableRuns, setTotalComparableRuns] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notFinished, setNotFinished] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!runId) return;

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    setLoading(true);
    setError(null);
    setNotFinished(false);
    setTotalComparableRuns(null);

    getComparableTestRuns(runId, { page: 1, size: 1 })
      .then((response) => {
        if (!active) return;
        setTotalComparableRuns(response.page.totalElements);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.code === 'TEST_RUN_NOT_FINISHED') {
          setNotFinished(true);
          retryTimer = setTimeout(() => {
            if (active) setReloadToken((value) => value + 1);
          }, 2000);
          return;
        }
        setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [runId, reloadToken]);

  const retry = () => setReloadToken((value) => value + 1);

  return (
    <section className="rounded-2xl border border-[#dbe8e2] bg-[#f4fbf8] p-5 shadow-[0_3px_15px_rgba(17,31,44,0.02)] sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1a7f5a]">
            <GitCompareArrows size={14} /> Regression
          </div>
          <h2 className="text-base font-extrabold text-[#17202a]">과거 Run 대비 변화 확인</h2>
          {loading && (
            <p className="mt-2 flex items-center gap-2 text-xs text-[#697586]">
              <Loader2 size={13} className="animate-spin" /> 비교 가능한 과거 Run을 확인하고 있습니다.
            </p>
          )}
          {!loading && notFinished && (
            <p className="mt-2 text-xs text-[#78501b]">현재 Run이 종료되면 비교 가능한 과거 Run을 자동으로 확인합니다.</p>
          )}
          {!loading && !notFinished && totalComparableRuns !== null && (
            <p className="mt-2 text-xs text-[#697586]">
              {totalComparableRuns > 0
                ? `Backend가 비교 가능하다고 판정한 과거 Run이 ${totalComparableRuns}개 있습니다.`
                : '현재 비교 가능한 과거 Run이 없습니다.'}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenDetail}
          disabled={!runId || loading || notFinished || totalComparableRuns === 0}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17202a] px-4 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-[#25313d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          회귀 상세 보기 <ArrowRight size={14} />
        </button>
      </div>

      {error !== null && !loading && (
        <div className="mt-4">
          <RequestErrorBanner
            error={error}
            fallbackMessage="비교 가능한 과거 Run을 불러오지 못했습니다."
            onRetry={retry}
          />
        </div>
      )}
    </section>
  );
}
