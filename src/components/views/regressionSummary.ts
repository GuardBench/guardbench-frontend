import type { RegressionChangeType, TestRunComparisonSummaryRes } from '../../services/regressionService';

export interface RegressionSummaryItem {
  label: '악화' | '개선' | '변화 없음' | '비교 불가';
  value: number;
}

export function regressionSummaryItems(comparison: TestRunComparisonSummaryRes): RegressionSummaryItem[] {
  return [
    { label: '악화', value: comparison.regressedCount },
    { label: '개선', value: comparison.improvedCount },
    { label: '변화 없음', value: comparison.unchangedCount },
    { label: '비교 불가', value: comparison.notComparableCount },
  ];
}

export function regressionChangeTypeLabel(changeType: RegressionChangeType | null) {
  if (changeType === null) return '비교 불가';
  return ({
    NO_CHANGE: '변화 없음',
    SECURITY_REGRESSION: '보안 악화',
    USABILITY_REGRESSION: '사용성 악화',
    IMPROVEMENT: '개선',
    POLICY_BEHAVIOR_CHANGED: '정책 동작 변경',
  } satisfies Record<RegressionChangeType, string>)[changeType];
}
