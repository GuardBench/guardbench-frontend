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

export const qualityGateTitle = (status: QualityGateStatus | null) => (
  status === 'PASS' ? 'Quality Gate 통과'
    : status === 'FAIL' ? 'Quality Gate 실패'
      : status === 'NOT_EVALUATED' ? 'Quality Gate 평가 불가' : 'Quality Gate 평가 전'
);

export const failedQualityGateReasons = (metrics: QualityGateMetricsRes | null) => {
  if (!metrics) return [];
  return (Object.keys(QUALITY_GATE_METRIC_PRESENTATION) as Array<keyof typeof QUALITY_GATE_METRIC_PRESENTATION>)
    .filter((key) => !metrics[key].passed)
    .map((key) => QUALITY_GATE_METRIC_PRESENTATION[key].failureReason);
};
