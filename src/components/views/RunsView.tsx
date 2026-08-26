import React, { useState, useEffect } from 'react';
import type { TestRun } from '../../types';
import { mockRuns } from '../../mocks/mockData';
import { StatusPill } from '../common/StatusPill';
import { Plus, Search, Loader2 } from 'lucide-react';
import { listTestRuns } from '../../services/testRunService';

interface RunsViewProps {
  onGoNewRun: () => void;
  onSelectRun: (id: string) => void;
}

export const RunsView: React.FC<RunsViewProps> = ({ onGoNewRun, onSelectRun }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [runs, setRuns] = useState<TestRun[]>(mockRuns);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchRuns = async () => {
      setIsLoading(true);
      try {
        const res = await listTestRuns();
        if (isMounted && res.items && res.items.length > 0) {
          setRuns(res.items);
        }
      } catch (_err) {
        if (isMounted) {
          setRuns(mockRuns);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRuns();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRuns = runs.filter((run) => {
    const matchesSearch =
      run.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.suiteName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case 'RUNNING':
        return run.progressState !== 'FINISHED';
      case 'COMPLETED':
        return run.executionResultState === 'COMPLETED';
      case 'INCOMPLETE':
        return run.executionResultState === 'INCOMPLETE';
      case 'FAILED':
        return run.executionResultState === 'FAILED';
      case 'GATE_PASS':
        return run.qualityGateState === 'PASS';
      case 'GATE_FAIL':
        return run.qualityGateState === 'FAIL';
      case 'NOT_EVALUATED':
        return run.qualityGateState === 'NOT_EVALUATED';
      default:
        return true;
    }
  });

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

      {/* Table Card */}
      <article className="bg-white border border-[#e5e9ee] rounded-2xl shadow-[0_3px_15px_rgba(17,31,44,0.025)] overflow-hidden">
        {/* Table Tools with 7-way filter */}
        <div className="p-4 sm:p-5 border-b border-[#e5e9ee] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a949e]" size={16} />
            <input
              type="text"
              placeholder="실행 ID 또는 스위트 검색"
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
            <option value="FAILED">🚨 실행 오류</option>
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
                <th className="py-3 px-5">테스트 스위트</th>
                <th className="py-3 px-5">진행 상태</th>
                <th className="py-3 px-5">실행 결과</th>
                <th className="py-3 px-5">Quality Gate</th>
                <th className="py-3 px-5">Baseline → Candidate</th>
                <th className="py-3 px-5">생성 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e9ee]">
              {filteredRuns.map((run) => (
                <tr
                  key={run.id}
                  onClick={() => onSelectRun(run.id)}
                  className="hover:bg-[#fafcfb] transition-colors cursor-pointer"
                >
                  <td className="py-4 px-5 font-mono text-[#697586] font-semibold">{run.id}</td>
                  <td className="py-4 px-5">
                    <b className="block text-sm text-[#17202a]">{run.suiteName}</b>
                    <small className="text-[11px] text-[#697586]">{run.snapshotsText}</small>
                  </td>
                  <td className="py-4 px-5">
                    <StatusPill kind="progress" status={run.progressState} />
                  </td>
                  <td className="py-4 px-5">
                    {run.executionResultState ? (
                      <StatusPill kind="execution" status={run.executionResultState} />
                    ) : (
                      <span className="text-xs text-[#8fa0ad]">—</span>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    <StatusPill kind="gate" status={run.qualityGateState} />
                  </td>
                  <td className="py-4 px-5 font-medium text-[#17202a]">{run.versionChange}</td>
                  <td className="py-4 px-5 text-[#697586]">{run.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};
