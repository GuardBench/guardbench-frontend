import { useId, type ReactNode } from 'react';
import type { QualityGateMetricRes, QualityGateMetricsRes, QualityGateStatus } from '../../services/testRunService';
import {
  failedQualityGateReasons,
  QUALITY_GATE_METRIC_PRESENTATION,
  qualityGatePercentageLabels,
  qualityGatePresentation,
} from './qualityGatePresentation';

const QualityGateMetricEvidence = ({ metricKey, metric }: {
  metricKey: keyof typeof QUALITY_GATE_METRIC_PRESENTATION;
  metric: QualityGateMetricRes;
}) => {
  const presentation = QUALITY_GATE_METRIC_PRESENTATION[metricKey];
  const { valueLabel, thresholdLabel } = qualityGatePercentageLabels(metric.value, metric.threshold);
  return <div className="rounded-xl border border-black/10 bg-white/60 p-3">
    <dt className="text-[#697586]">{presentation.label}</dt>
    <dd className="mt-1">
      <span className="block font-black text-[#17202a]">현재 {valueLabel}</span>
      <span className="mt-0.5 block text-[11px] font-medium text-[#697586]">최소 기준 {thresholdLabel}</span>
      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${metric.passed ? 'bg-[#d9f2e5] text-[#146c4c]' : 'bg-[#f9d9d6] text-[#a8322d]'}`}>
        {metric.passed ? '기준 충족' : '기준 미달'}
      </span>
    </dd>
  </div>;
};

export interface QualityGateEvidenceProps {
  status: QualityGateStatus | null;
  metrics: QualityGateMetricsRes | null;
  summaryDescription: string;
  attentionDescription?: string | null;
  missingMetricsDescription: string;
  children: ReactNode;
}

export const QualityGateEvidence = ({
  status,
  metrics,
  summaryDescription,
  attentionDescription,
  missingMetricsDescription,
  children,
}: QualityGateEvidenceProps) => {
  const titleId = useId();
  const failureTitleId = useId();
  const presentation = qualityGatePresentation(status);
  const failureReasons = status === 'FAIL' ? failedQualityGateReasons(metrics) : [];

  return <article aria-labelledby={titleId} className={`overflow-hidden rounded-2xl border ${presentation.cardClassName}`}>
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.4fr] lg:p-7">
      <div>
        <div className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black tracking-wide ${presentation.badgeClassName}`}>QUALITY GATE</div>
        <h2 id={titleId} className={`mt-4 text-2xl font-black ${presentation.titleClassName}`}>{presentation.title}</h2>
        <p aria-live="polite" className="mt-2 text-base font-bold text-[#17202a]">{summaryDescription}</p>
        {attentionDescription && <p className="mt-1 text-xs text-[#697586]">{attentionDescription}</p>}
        {metrics ? <>
          <dl aria-label="Quality Gate 판정 근거" className="mt-5 grid grid-cols-1 gap-3 border-t border-black/10 pt-4 text-xs sm:grid-cols-2">
            <QualityGateMetricEvidence metricKey="assertion" metric={metrics.assertion} />
            <QualityGateMetricEvidence metricKey="execution" metric={metrics.execution} />
          </dl>
          {failureReasons.length > 0 && <section aria-labelledby={failureTitleId} className="mt-3 rounded-xl border border-[#f4c7c3] bg-white/70 p-3 text-xs text-[#8f2f2a]">
            <h3 id={failureTitleId} className="font-bold">실패 이유</h3>
            <ul className="mt-1 list-disc space-y-1 pl-4">{failureReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </section>}
        </> : <p className="mt-5 border-t border-black/10 pt-4 text-xs text-[#697586]">{missingMetricsDescription}</p>}
      </div>
      {children}
    </div>
    <p className="border-t border-black/10 px-6 py-3 text-[11px] text-[#697586] lg:px-7">Quality Gate 상태와 지표는 서버 판정을 그대로 표시하며, 현재 결과 페이지에서 다시 계산하지 않습니다.</p>
  </article>;
};
