import { apiRequest } from './apiClient';
import type {
  Action,
  PageMetaRes,
  TargetReferenceRes,
} from './testRunService';

export interface ComparableTestRunListItemRes {
  id: number;
  testSuiteId: number;
  target: TargetReferenceRes;
  completedAt: string;
}

export interface ComparableTestRunListRes {
  items: ComparableTestRunListItemRes[];
  page: PageMetaRes;
}

export type ComparabilityStatus = 'COMPARABLE' | 'NOT_COMPARABLE';

export type RegressionChangeType =
  | 'NO_CHANGE'
  | 'SECURITY_REGRESSION'
  | 'USABILITY_REGRESSION'
  | 'IMPROVEMENT'
  | 'POLICY_BEHAVIOR_CHANGED';

export interface TestRunComparisonItemRes {
  snapshotId: number;
  testCaseId: number;
  name: string;
  input: string;
  expectedAction: Action;
  comparisonVerdict: Action | null;
  currentVerdict: Action | null;
  comparabilityStatus: ComparabilityStatus;
  changeType: RegressionChangeType | null;
}

export interface TestRunComparisonRes {
  currentRunId: number;
  comparisonRunId: number;
  totalCases: number;
  changedCount: number;
  unchangedCount: number;
  improvedCount: number;
  regressedCount: number;
  notComparableCount: number;
  items: TestRunComparisonItemRes[];
}

export async function getComparableTestRuns(
  testRunId: number | string,
  params?: { page?: number; size?: number },
): Promise<ComparableTestRunListRes> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.size) query.append('size', params.size.toString());
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return apiRequest<ComparableTestRunListRes>(
    `/test-runs/${testRunId}/comparable-runs${queryString}`,
  );
}

export async function getTestRunComparison(
  currentRunId: number | string,
  comparisonRunId: number | string,
): Promise<TestRunComparisonRes> {
  return apiRequest<TestRunComparisonRes>(
    `/test-runs/${currentRunId}/comparisons/${comparisonRunId}`,
  );
}
