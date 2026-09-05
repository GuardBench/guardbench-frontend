import type { TestRunComparisonSummaryRes } from '../../services/regressionService';

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
