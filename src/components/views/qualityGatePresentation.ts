import type { QualityGateMetricsRes, QualityGateStatus } from '../../services/testRunService';

export const QUALITY_GATE_METRIC_PRESENTATION = {
  assertion: {
    label: '기대 일치율',
    failureReason: '기대 동작과 일치한 결과 비율이 설정한 기준보다 낮습니다.',
  },
  execution: {
    label: '실행 성공률',
    failureReason: '정상 처리된 테스트 비율이 설정한 기준보다 낮습니다.',
  },
} as const;

export type QualityGatePresentationStatus = QualityGateStatus | 'NOT_EVALUATED_BEFORE_FINISH';

interface QualityGateStatusPresentation {
  title: string;
  cardClassName: string;
  badgeClassName: string;
  titleClassName: string;
}

export const QUALITY_GATE_STATUS_PRESENTATION = {
  PASS: {
    title: 'Quality Gate 통과',
    cardClassName: 'border-[#cfe9dc] bg-[#f1faf6]',
    badgeClassName: 'bg-[#d9f2e5] text-[#146c4c]',
    titleClassName: 'text-[#146c4c]',
  },
  FAIL: {
    title: 'Quality Gate 실패',
    cardClassName: 'border-[#f4c7c3] bg-[#fff0ef]',
    badgeClassName: 'bg-[#f9d9d6] text-[#a8322d]',
    titleClassName: 'text-[#a8322d]',
  },
  NOT_EVALUATED: {
    title: 'Quality Gate 평가 불가',
    cardClassName: 'border-[#dfe5e9] bg-[#f6f8f9]',
    badgeClassName: 'bg-[#e7ebee] text-[#586473]',
    titleClassName: 'text-[#43515d]',
  },
  NOT_EVALUATED_BEFORE_FINISH: {
    title: 'Quality Gate 평가 전',
    cardClassName: 'border-[#dfe5e9] bg-[#f6f8f9]',
    badgeClassName: 'bg-[#e7ebee] text-[#586473]',
    titleClassName: 'text-[#43515d]',
  },
} as const satisfies Record<QualityGatePresentationStatus, QualityGateStatusPresentation>;

export const qualityGatePresentation = (status: QualityGateStatus | null) => (
  QUALITY_GATE_STATUS_PRESENTATION[status ?? 'NOT_EVALUATED_BEFORE_FINISH']
);

export const qualityGatePercentageLabels = (value: number, threshold: number) => {
  for (let fractionDigits = 2; fractionDigits <= 16; fractionDigits += 1) {
    const valueLabel = `${(value * 100).toFixed(fractionDigits)}%`;
    const thresholdLabel = `${(threshold * 100).toFixed(fractionDigits)}%`;
    if (value === threshold || valueLabel !== thresholdLabel) {
      return { valueLabel, thresholdLabel };
    }
  }

  return {
    valueLabel: `${value * 100}%`,
    thresholdLabel: `${threshold * 100}%`,
  };
};

export const failedQualityGateReasons = (metrics: QualityGateMetricsRes | null) => {
  if (!metrics) return [];
  return (Object.keys(QUALITY_GATE_METRIC_PRESENTATION) as Array<keyof typeof QUALITY_GATE_METRIC_PRESENTATION>)
    .filter((key) => !metrics[key].passed)
    .map((key) => QUALITY_GATE_METRIC_PRESENTATION[key].failureReason);
};
