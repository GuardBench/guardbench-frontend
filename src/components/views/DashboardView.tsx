import React from 'react';
import { StatCard } from '../common/StatCard';
import { StatusPill } from '../common/StatusPill';
import { mockActivities, mockChartData, mockStats } from '../../mocks/mockData';
import { Plus } from 'lucide-react';

interface DashboardViewProps {
  onGoNewRun: () => void;
  onGoRuns: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onGoNewRun, onGoRuns }) => {
  return (
    <section className="space-y-6 animate-rise">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[#1a7f5a] text-xs font-black tracking-widest uppercase mb-1.5">Overview</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17202a]">
            정책 변경을 배포 전에 검증하세요.
          </h1>
          <p className="text-[#697586] text-sm mt-1.5 leading-relaxed">
            Baseline과 Candidate를 동일한 Snapshot으로 비교하고, 회귀 위험을 한눈에 확인합니다.
          </p>
        </div>
        <button
          onClick={onGoNewRun}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#17202a] text-white text-sm font-bold shadow-sm hover:bg-[#253545] transition-all"
        >
          <Plus size={16} /> 새 테스트 실행
        </button>
      </div>

      {/* 4 Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockStats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_0.85fr] gap-5">
        {/* Quality Gate Trend Chart Card */}
        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-[#17202a]">최근 실행 결과</h2>
              <p className="text-xs text-[#697586] mt-1">일자별 Quality Gate 판정</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#f1f3f5] text-[#586473] text-[10px] font-extrabold">
              최근 7일
            </span>
          </div>

          {/* Bar Chart Simulation */}
          <div className="h-48 flex items-end gap-3 sm:gap-4 border-b border-[#e5e9ee] px-2 pb-1">
            {mockChartData.map((d, i) => (
              <div key={i} className="flex-1 flex items-end justify-center gap-1 h-full relative group">
                <div
                  className="w-full max-w-[20px] bg-[#40ad83] rounded-t-md transition-all duration-300 group-hover:brightness-105"
                  style={{ height: `${d.pass}%` }}
                  title={`Pass: ${d.pass}%`}
                />
                <div
                  className="w-full max-w-[20px] bg-[#e3736d] rounded-t-md transition-all duration-300 group-hover:brightness-105"
                  style={{ height: `${d.fail}%` }}
                  title={`Fail: ${d.fail}%`}
                />
                <span className="absolute -bottom-6 text-[10px] text-[#697586] font-medium whitespace-nowrap">
                  {d.date}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-8 text-xs text-[#697586]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#40ad83]" /> Gate 통과
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#e3736d]" /> Gate 실패
            </span>
          </div>
        </article>

        {/* Recent Activity Card */}
        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#17202a]">최근 활동</h2>
              <p className="text-xs text-[#697586] mt-1">실행 및 스위트 변경</p>
            </div>
            <button
              onClick={onGoRuns}
              className="text-xs font-bold text-[#697586] hover:text-[#17202a] transition-colors"
            >
              전체 보기 →
            </button>
          </div>

          <div className="divide-y divide-[#e5e9ee]">
            {mockActivities.map((act) => (
              <div key={act.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f2f4f6] grid place-items-center text-sm font-bold">
                    {act.icon}
                  </div>
                  <div>
                    <b className="block text-xs text-[#17202a]">{act.title}</b>
                    <small className="text-[11px] text-[#697586]">{act.subtitle}</small>
                  </div>
                </div>
                {act.timeText ? (
                  <span className="text-[11px] text-[#697586]">{act.timeText}</span>
                ) : (
                  <StatusPill status={act.status} />
                )}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
};
