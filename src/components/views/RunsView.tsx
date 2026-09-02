import React, { useState, useEffect } from 'react';
import type { TestRunListItemRes } from '../../services/testRunService';
import { listTestRuns } from '../../services/testRunService';
import { StatusPill } from '../common/StatusPill';
import { Plus, Search, Loader2 } from 'lucide-react';
import { RequestErrorBanner } from '../common/RequestErrorBanner';

interface RunsViewProps {
  onGoNewRun: () => void;
  onSelectRun: (id: string) => void;
}

export const RunsView: React.FC<RunsViewProps> = ({ onGoNewRun, onSelectRun }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [runs, setRuns] = useState<TestRunListItemRes[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasLoadedRuns, setHasLoadedRuns] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchRuns = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await listTestRuns();
        if (isMounted) {
          setRuns(res.items || []);
          setHasLoadedRuns(true);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRuns();
    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  const filteredRuns = runs.filter((run) => {
    const idStr = `#${run.id}`;
    const matchesSearch =
      idStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(run.testSuiteId).includes(searchTerm);

    if (!matchesSearch) return false;

    switch (filter) {
      case 'RUNNING':
        return run.status !== 'FINISHED';
      case 'COMPLETED':
        return run.executionOutcome === 'COMPLETED';
      case 'INCOMPLETE':
        return run.executionOutcome === 'INCOMPLETE';
      case 'ERROR':
        return run.executionOutcome === 'ERROR';
      case 'GATE_PASS':
        return run.qualityGateStatus === 'PASS';
      case 'GATE_FAIL':
        return run.qualityGateStatus === 'FAIL';
      case 'NOT_EVALUATED':
        return run.qualityGateStatus === 'NOT_EVALUATED';
      default:
        return true;
    }
  });

  /** 진행률 텍스트 생성 */
  const progressText = (run: TestRunListItemRes): string => {
    const processed = run.progress?.processedTestCaseCount ?? 0;
    const total = run.testCaseCount;
    if (run.status === 'FINISHED') {
      return `${total} snapshots · ${total * 2} executions`;
    }
    return `${total} snapshots · 실행 중 (${processed}/${total})`;
  };

  /** Quality Gate 상태를 StatusPill에 전달할 수 있는 형태로 변환 */
  const gateDisplayStatus = (run: TestRunListItemRes) => {
    if (run.qualityGateStatus) return run.qualityGateStatus;
    // qualityGateStatus가 null이면 아직 평가 전 (진행 중)
    return 'NOT_EVALUATED_BEFORE_FINISH';
  };

  return (
    <section className="space-y-6 animate-rise">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[#1a7f5a] text-xs font-black tracking-widest uppercase mb-1.5 flex items-center gap-2">
            <span>Execution history</span>
            {isLoading && <Loader2 size={13} className="animate-spin text-[#1a7f5a]" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17202a]">실행 이력</h1>
          <p className="text-[#697586] text-sm mt-1.5 leading-relaxed">
            진행 상태, 실행 결과, Quality Gate를 별도 축으로 분리하여 명확하게 표현합니다.
          </p>
        </div>
        <button
          onClick={onGoNewRun}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#17202a] text-white text-sm font-bold shadow-sm hover:bg-[#253545] transition-all"
        >
          <Plus size={16} /> 새 테스트 실행
        </button>
      </div>

      {/* Error Banner */}
      {loadError !== null && (
        <RequestErrorBanner
          error={loadError}
          fallbackMessage="실행 이력을 불러오지 못했습니다."
          stale={hasLoadedRuns}
          onRetry={() => setReloadToken((token) => token + 1)}
        />
      )}

      {/* Table Card */}
      <article className="bg-white border border-[#e5e9ee] rounded-2xl shadow-[0_3px_15px_rgba(17,31,44,0.025)] overflow-hidden">
        {/* Table Tools with 7-way filter */}
        <div className="p-4 sm:p-5 border-b border-[#e5e9ee] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a949e]" size={16} />
            <input
              type="text"
              placeholder="실행 ID 또는 Suite ID 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#e5e9ee] bg-[#f8f9fa] text-xs text-[#17202a] outline-none focus:border-[#1a7f5a] focus:bg-white"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-[#e5e9ee] bg-white text-xs text-[#17202a] outline-none focus:border-[#1a7f5a] font-medium"
          >
            <option value="ALL">전체 상태 보기</option>
            <option value="RUNNING">⏳ 진행 중</option>
            <option value="COMPLETED">✓ 정상 완료</option>
            <option value="INCOMPLETE">⚠️ 부분 완료</option>
            <option value="ERROR">🚨 실행 오류</option>
            <option value="GATE_PASS">🛡️ Gate 통과</option>
            <option value="GATE_FAIL">❌ Gate 실패</option>
            <option value="NOT_EVALUATED">⚪ 평가 불가</option>
          </select>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[760px]">
            <thead>
              <tr className="bg-[#fafbfb] border-b border-[#e5e9ee] text-[#7a8592] uppercase font-bold tracking-wider text-[10px]">
                <th className="py-3 px-5">Run ID</th>
                <th className="py-3 px-5">Suite ID</th>
                <th className="py-3 px-5">진행 상태</th>
                <th className="py-3 px-5">실행 결과</th>
                <th className="py-3 px-5">Quality Gate</th>
                <th className="py-3 px-5">Snapshots</th>
                <th className="py-3 px-5">생성 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e9ee]">
              {filteredRuns.length > 0 ? (
                filteredRuns.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => onSelectRun(String(run.id))}
                    className="hover:bg-[#fafcfb] transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-5 font-mono text-[#697586] font-semibold">#{run.id}</td>
                    <td className="py-4 px-5">
                      <b className="block text-sm text-[#17202a]">Suite #{run.testSuiteId}</b>
                      <small className="text-[11px] text-[#697586]">{progressText(run)}</small>
                    </td>
                    <td className="py-4 px-5">
                      <StatusPill kind="progress" status={run.status} />
                    </td>
                    <td className="py-4 px-5">
                      {run.executionOutcome ? (
                        <StatusPill kind="execution" status={run.executionOutcome} />
                      ) : (
                        <span className="text-xs text-[#8fa0ad]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <StatusPill kind="gate" status={gateDisplayStatus(run)} />
                    </td>
                    <td className="py-4 px-5 font-medium text-[#17202a]">
                      {run.testCaseCount}개
                    </td>
                    <td className="py-4 px-5 text-[#697586]">{run.createdAt}</td>
                  </tr>
                ))
              ) : hasLoadedRuns ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#697586]">
                    실행 이력이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};
