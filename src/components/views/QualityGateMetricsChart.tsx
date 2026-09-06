import React from 'react';
import { StatusPill } from '../common/StatusPill';
import type { QualityGateMetricRes, TestRunListItemRes } from '../../services/testRunService';

interface QualityGateMetricsChartProps {
  runs: TestRunListItemRes[];
}

const metricPercent = (rate: number) => Math.min(100, Math.max(0, rate * 100));
const percentLabel = (rate: number) => `${metricPercent(rate).toFixed(1)}%`;

const MetricBar: React.FC<{
  metric: QualityGateMetricRes;
  label: string;
  runId: number;
  colorClass: string;
}> = ({ metric, label, runId, colorClass }) => {
  const value = metricPercent(metric.value);
  const threshold = metricPercent(metric.threshold);
  const accessibleLabel = `실행 #${runId} ${label} ${percentLabel(metric.value)}, 기준 ${percentLabel(metric.threshold)}, ${metric.passed ? '기준 충족' : '기준 미달'}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-36 flex-col items-center">
        <span className="h-4 text-[9px] font-black text-[#17202a]">{percentLabel(metric.value)}</span>
        <div className="relative h-32 w-9 rounded-t-md bg-[#eef1f4]">
          <div
            role="meter"
            aria-label={accessibleLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            aria-valuetext={accessibleLabel}
            className={`absolute inset-x-0 bottom-0 rounded-t-md ${colorClass}`}
            style={{ height: `${value}%` }}
          />
          <span
            className="pointer-events-none absolute inset-x-[-3px] z-10 border-t-2 border-dashed border-[#566271]"
            style={{ bottom: `${threshold}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
      <span className="text-[10px] font-bold text-[#697586]">{label}</span>
      <span className={`text-[9px] font-extrabold ${metric.passed ? 'text-[#1a7f5a]' : 'text-[#bd3b35]'}`}>
        {metric.passed ? '충족' : '미달'}
      </span>
    </div>
  );
};

export const QualityGateMetricsChart: React.FC<QualityGateMetricsChartProps> = ({ runs }) => {
  const chartRuns = runs.slice(0, 4).reverse();

  if (chartRuns.length === 0) {
    return (
      <div className="grid h-48 place-items-center border-b border-[#e5e9ee] text-xs text-[#697586]">
        표시할 실행 이력이 없습니다.
      </div>
    );
  }

  return (
    <figure aria-labelledby="quality-gate-chart-title">
      <figcaption id="quality-gate-chart-title" className="sr-only">
        최근 실행별 기대 일치율과 실행 성공률
      </figcaption>
      <div className="flex gap-3 border-b border-[#e5e9ee] px-1 pb-3">
        <div className="flex h-36 shrink-0 flex-col justify-between pb-px pt-4 text-right text-[9px] text-[#8a98a5]" aria-hidden="true">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="flex min-w-0 flex-1 items-end justify-around gap-3">
          {chartRuns.map((run, index) => {
            const metrics = run.qualityGateMetrics;
            const hideOnMobile = chartRuns.length === 4 && index === 0;
            return (
              <div
                key={run.id}
                role="group"
                aria-label={`실행 #${run.id}`}
                className={`${hideOnMobile ? 'hidden sm:flex' : 'flex'} min-w-0 flex-1 flex-col items-center gap-3`}
              >
                {metrics ? (
                  <div className="flex items-end justify-center gap-2 sm:gap-3">
                    <MetricBar metric={metrics.assertion} label="기대" runId={run.id} colorClass="bg-[#6f83d6]" />
                    <MetricBar metric={metrics.execution} label="실행" runId={run.id} colorClass="bg-[#40ad83]" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="grid h-36 w-20 place-items-center rounded-lg border border-dashed border-[#cbd3da] bg-[#f8f9fa] px-2 text-center text-[10px] font-bold text-[#697586]">
                      {run.qualityGateStatus === 'NOT_EVALUATED' ? '지표 없음' : '평가 전'}
                    </div>
                    <span className="invisible text-[10px]" aria-hidden="true">지표</span>
                    <span className="invisible text-[9px]" aria-hidden="true">상태</span>
                  </div>
                )}
                <div className="flex flex-col items-center gap-1.5">
                  <b className="text-[11px] text-[#17202a]">#{run.id}</b>
                  <StatusPill
                    kind={run.qualityGateStatus ? 'gate' : 'progress'}
                    status={run.qualityGateStatus ?? run.status}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] font-bold text-[#697586]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#6f83d6]" />기대 일치율</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#40ad83]" />실행 성공률</span>
        <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-[#566271]" />실행별 기준</span>
      </div>
    </figure>
  );
};
