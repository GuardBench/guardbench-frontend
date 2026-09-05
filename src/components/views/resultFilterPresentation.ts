export interface ResultFilterState {
  name: string;
  input: string;
  category: string;
  expectedAction: string;
  severity: string;
  executionStatus: string;
  assertionStatus: string;
  evaluationOutcome: string;
  sort: string;
}

const hasNonOutcomeAdvancedFilter = (filters: ResultFilterState) => Boolean(
  filters.name
  || filters.input
  || filters.category
  || filters.expectedAction
  || filters.severity
  || filters.executionStatus
  || filters.assertionStatus
);

export const hasActiveResultFilter = (
  filters: ResultFilterState,
  attentionTypeCount: number,
) => hasNonOutcomeAdvancedFilter(filters)
  || filters.evaluationOutcome !== 'ALL'
  || attentionTypeCount > 0;

export const hasUnfilteredResultCountMismatch = ({
  filters,
  attentionTypeCount,
  totalElements,
  testCaseCount,
}: {
  filters: ResultFilterState;
  attentionTypeCount: number;
  totalElements: number;
  testCaseCount: number;
}) => !hasActiveResultFilter(filters, attentionTypeCount) && totalElements !== testCaseCount;

export const resultEmptyMessage = ({
  filters,
  attentionTypeCount,
  resultCountMismatch,
}: {
  filters: ResultFilterState;
  attentionTypeCount: number;
  resultCountMismatch: boolean;
}) => {
  const outcomeFiltered = filters.evaluationOutcome !== 'ALL';
  const attentionFiltered = attentionTypeCount > 0;

  if (hasNonOutcomeAdvancedFilter(filters) || (outcomeFiltered && attentionFiltered)) {
    return '현재 필터 조건에 해당하는 케이스가 없습니다.';
  }
  if (outcomeFiltered) return '이 판정 유형에 해당하는 결과가 없습니다.';
  if (attentionFiltered) return '선택한 확인 필요 유형에 해당하는 결과가 없습니다.';
  if (resultCountMismatch) return '결과 수 불일치를 확인해 주세요.';
  return '표시할 결과가 없습니다.';
};
