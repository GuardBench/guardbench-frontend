import type { TestRunComparisonRes } from '../../services/regressionService';

export interface RegressionSummaryItem {
  label: 'Regression' | 'Improvement' | 'Unchanged' | '비교 불가';
  value: number;
}

export function regressionSummaryItems(comparison: TestRunComparisonRes): RegressionSummaryItem[] {
  const items: RegressionSummaryItem[] = [
    { label: 'Regression', value: comparison.regressedCount },
    { label: 'Improvement', value: comparison.improvedCount },
    { label: 'Unchanged', value: comparison.unchangedCount },
  ];
  if (comparison.notComparableCount > 0) {
    items.push({ label: '비교 불가', value: comparison.notComparableCount });
  }
  return items;
}
