import { useMemo, useState } from 'react';
import { GitCompareArrows, Loader2, RefreshCw } from 'lucide-react';
import type { RegressionDetailState } from '../../hooks/useRegressionComparison';
import type { RegressionChangeType } from '../../services/regressionService';
import { RequestErrorBanner } from '../common/RequestErrorBanner';
import { regressionChangeTypeLabel } from './regressionSummary';

interface RegressionComparisonSectionProps {
  regression: RegressionDetailState;
}

const completedAtLabel = (value: string) => new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value));

const changeTypeClass = (changeType: RegressionChangeType | null) => {
  if (changeType === 'SECURITY_REGRESSION' || changeType === 'USABILITY_REGRESSION') {
    return 'bg-[#fff0ef] text-[#a63b36]';
  }
  if (changeType === 'IMPROVEMENT') return 'bg-[#eef8f4] text-[#1a7f5a]';
  if (changeType === 'POLICY_BEHAVIOR_CHANGED') return 'bg-[#fff7e8] text-[#78501b]';
  return 'bg-[#eef1f4] text-[#697586]';
};

const verdictLabel = (value: 'ALLOW' | 'BLOCK' | null) => value ?? '—';

export function RegressionComparisonSection({ regression }: RegressionComparisonSectionProps) {
  const {
    runId,
    candidates,
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
    autoRetryExhausted,
    hasLoadedCandidates,
    setCandidatePage,
    selectComparison,
    refreshCandidates,
    refreshComparison,
  } = regression;
  const [changedOnly, setChangedOnly] = useState(true);
  const [includeNotComparable, setIncludeNotComparable] = useState(false);
  const visibleItems = useMemo(() => {
    if (!comparison) return [];

    return comparison.items.filter((item) => {
      if (item.comparabilityStatus === 'NOT_COMPARABLE') {
        return includeNotComparable;
      }
      if (changedOnly) {
        return item.changeType !== 'NO_CHANGE';
      }
      return true;
    });
  }, [changedOnly, comparison, includeNotComparable]);

  return (
    <section className="space-y-4 rounded-2xl border border-[#e5e9ee] bg-white p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)] sm:p-7">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1a7f5a]">
            <GitCompareArrows size={14} /> Regression
          </div>
          <h2 className="text-lg font-extrabold text-[#17202a]">과거 Run과 저장 결과 비교</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#697586]">
            Current Run #{runId}과 Backend가 comparable로 판정한 과거 Run의 Evaluator 결과를 비교합니다. Application과 Evaluator를 다시 실행하지 않습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            refreshCandidates();
            refreshComparison();
          }}
          disabled={candidatesLoading || comparisonLoading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e5e9ee] px-3 py-2 text-xs font-bold disabled:opacity-50"
        >
          <RefreshCw size={13} /> 비교 새로고침
        </button>
      </header>

      {notFinished && (
        <div className="rounded-xl border border-[#f0ddb0] bg-[#fff7e8] px-4 py-3 text-xs text-[#78501b]">
          {autoRetryExhausted
            ? '자동 확인을 5회 마쳤습니다. Run 상태를 확인한 뒤 다시 시도해 주세요.'
            : '현재 Run이 종료된 뒤 비교 가능한 과거 Run을 자동으로 다시 확인합니다.'}
        </div>
      )}

      {candidatesError !== null && !candidatesLoading && (
        <RequestErrorBanner
          error={candidatesError}
          fallbackMessage="비교 가능한 과거 Run을 불러오지 못했습니다."
          onRetry={refreshCandidates}
        />
      )}

      {candidatesLoading && !notFinished && (
        <div className="flex items-center gap-2 py-4 text-xs text-[#697586]">
          <Loader2 size={14} className="animate-spin" /> 비교 가능한 과거 Run을 확인하고 있습니다.
        </div>
      )}

      {!candidatesLoading && hasLoadedCandidates && !notFinished && candidates.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#dce1e6] bg-[#f8f9fa] px-4 py-6 text-center text-xs text-[#697586]">
          동일한 평가 정책과 테스트 정의로 비교할 수 있는 과거 Run이 없습니다.
        </div>
      )}

      {!candidatesLoading && candidates.length > 0 && (
        <div className="space-y-3">
          <div>
            <label htmlFor="comparison-run" className="mb-2 block text-xs font-bold text-[#4e5a68]">비교할 과거 Run</label>
            <select
              id="comparison-run"
              value={selectedComparisonId}
              onChange={(event) => selectComparison(event.target.value)}
              className="w-full rounded-xl border border-[#dce1e6] bg-white px-3.5 py-2.5 text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10"
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  Run #{candidate.id} · {candidate.target.model} · {completedAtLabel(candidate.completedAt)}
                </option>
              ))}
            </select>
            {selectedAutomatically && (
              <p className="mt-2 text-[11px] font-semibold text-[#1a7f5a]">가장 최근의 비교 가능한 Run을 자동으로 선택했습니다.</p>
            )}
            {candidatePageMeta && candidatePageMeta.totalPages > 1 && (
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[#697586]">
                <span>{candidatePageMeta.number} / {candidatePageMeta.totalPages} 페이지 · 총 {candidatePageMeta.totalElements}개</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={!candidatePageMeta.hasPrevious || candidatesLoading}
                    onClick={() => setCandidatePage((page) => Math.max(1, page - 1))}
                    className="rounded-lg border border-[#dce1e6] px-2.5 py-1 font-bold disabled:opacity-40"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    disabled={!candidatePageMeta.hasNext || candidatesLoading}
                    onClick={() => setCandidatePage((page) => page + 1)}
                    className="rounded-lg border border-[#dce1e6] px-2.5 py-1 font-bold disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedCandidate && (
            <dl className="grid gap-3 rounded-xl bg-[#f8f9fa] p-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[#697586]">Application</dt>
                <dd className="mt-1 break-all font-bold text-[#17202a]">{selectedCandidate.target.identifier}</dd>
                <dd className="mt-1 text-[10px] text-[#697586]">Model: {selectedCandidate.target.model}{selectedCandidate.target.revision ? ` · Revision: ${selectedCandidate.target.revision}` : ''}</dd>
              </div>
              <div>
                <dt className="text-[#697586]">완료 시각</dt>
                <dd className="mt-1 font-bold text-[#17202a]">{completedAtLabel(selectedCandidate.completedAt)}</dd>
              </div>
            </dl>
          )}
        </div>
      )}

      {comparisonError !== null && !comparisonLoading && (
        <RequestErrorBanner
          error={comparisonError}
          fallbackMessage="선택한 Run과의 Regression 비교를 불러오지 못했습니다."
          onRetry={refreshComparison}
        />
      )}

      {comparisonLoading && (
        <div className="flex items-center gap-2 py-4 text-xs text-[#697586]">
          <Loader2 size={14} className="animate-spin" /> 저장된 Evaluator 결과를 비교하고 있습니다.
        </div>
      )}

      {comparison && !comparisonLoading && (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['전체', comparison.totalCases],
              ['변경', comparison.changedCount],
              ['변화 없음', comparison.unchangedCount],
              ['악화', comparison.regressedCount],
              ['개선', comparison.improvedCount],
              ['비교 불가', comparison.notComparableCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#e5e9ee] p-3">
                <div className="text-[10px] font-bold text-[#697586]">{label}</div>
                <div className="mt-1 text-xl font-black text-[#17202a]">{value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-bold text-[#17202a]">Snapshot 비교 결과</div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#4e5a68]">
                <input
                  type="checkbox"
                  checked={changedOnly}
                  onChange={(event) => setChangedOnly(event.target.checked)}
                  className="accent-[#1a7f5a]"
                />
                변화가 있는 케이스만 보기
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#4e5a68]">
                <input
                  type="checkbox"
                  checked={includeNotComparable}
                  onChange={(event) => setIncludeNotComparable(event.target.checked)}
                  className="accent-[#1a7f5a]"
                />
                비교 불가 포함
              </label>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#e5e9ee]">
            <table className="min-w-[850px] w-full text-left text-xs">
              <thead className="bg-[#f8f9fa] text-[#697586]">
                <tr>
                  <th className="px-4 py-3 font-bold">TestCase</th>
                  <th className="px-3 py-3 font-bold">Expected</th>
                  <th className="px-3 py-3 font-bold">Previous</th>
                  <th className="px-3 py-3 font-bold">Current</th>
                  <th className="px-3 py-3 font-bold">Change</th>
                  <th className="px-3 py-3 font-bold">Comparability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e9ee]">
                {visibleItems.map((item) => (
                  <tr key={item.snapshotId} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#17202a]">{item.name}</div>
                      <div className="mt-1 max-w-[360px] truncate text-[10px] text-[#697586]" title={item.input}>{item.input}</div>
                    </td>
                    <td className="px-3 py-3 font-bold">{item.expectedAction}</td>
                    <td className="px-3 py-3 font-bold">{verdictLabel(item.comparisonVerdict)}</td>
                    <td className="px-3 py-3 font-bold">{verdictLabel(item.currentVerdict)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${changeTypeClass(item.changeType)}`}>
                        {regressionChangeTypeLabel(item.changeType)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#4e5a68]">{item.comparabilityStatus === 'COMPARABLE' ? '비교 가능' : '비교 불가'}</td>
                  </tr>
                ))}
                {visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#697586]">
                      현재 필터에 표시할 비교 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
