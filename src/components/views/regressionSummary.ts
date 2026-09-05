import type { TestRunComparisonSummaryRes } from '../../services/regressionService';

export interface RegressionSummaryItem {
  label: 'Regression' | 'Improvement' | 'Unchanged' | '비교 불가';
  value: number;
}

export function regressionSummaryItems(comparison: TestRunComparisonSummaryRes): RegressionSummaryItem[] {
  return [
    { label: 'Regression', value: comparison.regressedCount },
    { label: 'Improvement', value: comparison.improvedCount },
    { label: 'Unchanged', value: comparison.unchangedCount },
    { label: '비교 불가', value: comparison.notComparableCount },
  ];
}
