import type { RegressionChangeType, TestRunComparisonSummaryRes } from '../../services/regressionService';

export interface RegressionSummaryItem {
  label: '악화' | '개선' | '변화 없음' | '비교 불가';
  value: number;
}

export interface RegressionDetailSummaryGroup {
  id: 'overview' | 'changes';
  title: '비교 결과 요약' | '변경 상세';
  description?: string;
  items: Array<{
    label: '전체' | '변경' | '변화 없음' | '악화' | '개선' | '비교 불가';
    value: number;
    tone: 'neutral' | 'changed' | 'unchanged' | 'regressed' | 'improved' | 'notComparable';
  }>;
}

export interface RegressionDistributionSegment {
  label: RegressionSummaryItem['label'] | '기타';
  value: number;
  tone: 'regressed' | 'improved' | 'unchanged' | 'notComparable' | 'other';
  widthPercent: number;
}

export interface RegressionDistribution {
  segments: RegressionDistributionSegment[];
  categorizedCases: number;
  unaccountedCases: number;
  matchesTotal: boolean;
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
      id: 'overview',
      title: '비교 결과 요약',
      items: [
        { label: '전체', value: comparison.totalCases, tone: 'neutral' },
        { label: '변경', value: comparison.changedCount, tone: 'changed' },
        { label: '변화 없음', value: comparison.unchangedCount, tone: 'unchanged' },
      ],
    },
    {
      id: 'changes',
      title: '변경 상세',
      description: '악화와 개선은 변경 건수의 구성이며, 비교 불가는 판정 결과가 없어 변화를 판단할 수 없는 별도 항목입니다.',
      items: [
        { label: '악화', value: comparison.regressedCount, tone: 'regressed' },
        { label: '개선', value: comparison.improvedCount, tone: 'improved' },
        { label: '비교 불가', value: comparison.notComparableCount, tone: 'notComparable' },
      ],
    },
  ];
}

export function regressionDistribution(
  comparison: TestRunComparisonSummaryRes,
): RegressionDistribution {
  const categorized = [
    { label: '악화', value: comparison.regressedCount, tone: 'regressed' },
    { label: '개선', value: comparison.improvedCount, tone: 'improved' },
    { label: '변화 없음', value: comparison.unchangedCount, tone: 'unchanged' },
    { label: '비교 불가', value: comparison.notComparableCount, tone: 'notComparable' },
  ] as const;
  const categorizedCases = categorized.reduce((sum, segment) => sum + segment.value, 0);
  const unaccountedCases = Math.max(comparison.totalCases - categorizedCases, 0);
  const widthPercent = (value: number) => comparison.totalCases > 0
    ? Math.min((value / comparison.totalCases) * 100, 100)
    : 0;
  const segments: RegressionDistributionSegment[] = [
    ...categorized.map((segment) => ({ ...segment, widthPercent: widthPercent(segment.value) })),
    {
      label: '기타',
      value: unaccountedCases,
      tone: 'other',
      widthPercent: widthPercent(unaccountedCases),
    },
  ];
  return {
    segments,
    categorizedCases,
    unaccountedCases,
    matchesTotal: categorizedCases === comparison.totalCases,
  };
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
