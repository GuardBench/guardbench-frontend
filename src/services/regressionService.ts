import { apiRequest } from './apiClient';
import type {
  Action,
  EvaluationProfileReq,
  PageMetaRes,
  TargetReferenceRes,
} from './testRunService';

interface ComparableTestRunListItemApiRes {
  id: number;
  testSuiteId: number;
  target: TargetReferenceRes;
  completedAt: string;
}

export interface ComparableTestRunListItemRes extends ComparableTestRunListItemApiRes {
  evaluationProfile: EvaluationProfileReq;
}

interface ComparableTestRunListApiRes {
  items: ComparableTestRunListItemApiRes[];
  page: PageMetaRes;
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

const EMPTY_EVALUATION_PROFILE: EvaluationProfileReq = {
  checks: [],
  strictness: '—',
};

export async function getComparableTestRuns(
  testRunId: number | string,
  params?: { page?: number; size?: number },
): Promise<ComparableTestRunListRes> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.size) query.append('size', params.size.toString());
  const queryString = query.toString() ? `?${query.toString()}` : '';

  const response = await apiRequest<ComparableTestRunListApiRes>(
    `/test-runs/${testRunId}/comparable-runs${queryString}`,
  );

  return {
    ...response,
    items: response.items.map((item) => ({
      ...item,
      evaluationProfile: EMPTY_EVALUATION_PROFILE,
    })),
  };
}

export async function getTestRunComparison(
  currentRunId: number | string,
  comparisonRunId: number | string,
): Promise<TestRunComparisonRes> {
  return apiRequest<TestRunComparisonRes>(
    `/test-runs/${currentRunId}/comparisons/${comparisonRunId}`,
  );
}
