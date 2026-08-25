import React, { useState } from 'react';
import { mockRuns } from '../../mocks/mockData';
import { StatusPill } from '../common/StatusPill';
import { Plus, Search } from 'lucide-react';

interface RunsViewProps {
  onGoNewRun: () => void;
  onSelectRun: (id: string) => void;
}

export const RunsView: React.FC<RunsViewProps> = ({ onGoNewRun, onSelectRun }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredRuns = mockRuns.filter((run) => {
    const matchesSearch =
      run.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.suiteName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      run.qualityGateStatus === statusFilter ||
      run.executionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <section className="space-y-6 animate-rise">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[#1a7f5a] text-xs font-black tracking-widest uppercase mb-1.5">Execution history</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17202a]">실행 이력</h1>
          <p className="text-[#697586] text-sm mt-1.5 leading-relaxed">
            실행 신뢰성 상태와 Quality Gate 판정을 분리해 확인합니다.
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
        {/* Table Tools */}
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-[#e5e9ee] bg-white text-xs text-[#17202a] outline-none focus:border-[#1a7f5a]"
          >
            <option value="ALL">모든 상태</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="RUNNING">RUNNING</option>
          </select>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[720px]">
            <thead>
              <tr className="bg-[#fafbfb] border-b border-[#e5e9ee] text-[#7a8592] uppercase font-bold tracking-wider text-[10px]">
                <th className="py-3 px-5">Run ID</th>
                <th className="py-3 px-5">테스트 스위트</th>
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
                    <StatusPill status={run.executionStatus} />
                  </td>
                  <td className="py-4 px-5">
                    <StatusPill status={run.qualityGateStatus} />
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
