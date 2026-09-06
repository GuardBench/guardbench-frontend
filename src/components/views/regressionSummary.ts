import type { RegressionChangeType, TestRunComparisonSummaryRes } from '../../services/regressionService';

export interface RegressionSummaryItem {
  label: '악화' | '개선' | '변화 없음' | '비교 불가';
  value: number;
}

export interface RegressionDetailSummaryGroup {
  title: '비교 결과 요약' | '변경 상세';
  items: Array<{
    label: '전체' | '변경' | '변화 없음' | '악화' | '개선' | '비교 불가';
    value: number;
    tone: 'neutral' | 'changed' | 'unchanged' | 'regressed' | 'improved' | 'notComparable';
  }>;
}

export interface RegressionDistributionSegment {
  label: RegressionSummaryItem['label'];
  value: number;
  colorClassName: string;
}

export function regressionSummaryItems(comparison: TestRunComparisonSummaryRes): RegressionSummaryItem[] {
  return [
    { label: '악화', value: comparison.regressedCount },
    { label: '개선', value: comparison.improvedCount },
    { label: '변화 없음', value: comparison.unchangedCount },
    { label: '비교 불가', value: comparison.notComparableCount },
  ];
}

export function regressionDetailSummaryGroups(
  comparison: TestRunComparisonSummaryRes,
): RegressionDetailSummaryGroup[] {
  return [
    {
      title: '비교 결과 요약',
      items: [
        { label: '전체', value: comparison.totalCases, tone: 'neutral' },
        { label: '변경', value: comparison.changedCount, tone: 'changed' },
        { label: '변화 없음', value: comparison.unchangedCount, tone: 'unchanged' },
      ],
    },
    {
      title: '변경 상세',
      items: [
        { label: '악화', value: comparison.regressedCount, tone: 'regressed' },
        { label: '개선', value: comparison.improvedCount, tone: 'improved' },
        { label: '비교 불가', value: comparison.notComparableCount, tone: 'notComparable' },
      ],
    },
  ];
}

export function regressionDistributionSegments(
  comparison: TestRunComparisonSummaryRes,
): RegressionDistributionSegment[] {
  return [
    { label: '악화', value: comparison.regressedCount, colorClassName: 'bg-[#d55c55]' },
    { label: '개선', value: comparison.improvedCount, colorClassName: 'bg-[#1a7f5a]' },
    { label: '변화 없음', value: comparison.unchangedCount, colorClassName: 'bg-[#aeb7c2]' },
    { label: '비교 불가', value: comparison.notComparableCount, colorClassName: 'bg-[#d99520]' },
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
