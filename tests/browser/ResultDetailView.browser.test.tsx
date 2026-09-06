import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ResultDetailView } from '../../src/components/views/ResultDetailView';
import type { TestRunResultListItemRes } from '../../src/services/testRunService';
import { apiSuccess, deferred, installApiStub } from './support/apiStub';

const resultItem = (id: number): TestRunResultListItemRes => ({
  testCaseSnapshotId: id,
  name: `테스트 케이스 ${id}`,
  input: `입력 ${id}`,
  expectedAction: 'BLOCK',
  severity: 'HIGH',
  category: 'PROMPT_INJECTION',
  executionStatus: 'SUCCEEDED',
  evaluatorVerdict: 'BLOCK',
  assertionStatus: 'PASS',
  evaluationOutcome: 'TRUE_POSITIVE',
  attentionType: null,
  error: null,
});

const pageResponse = (number: number, totalPages: number, items = [resultItem(number)]) => ({
  items,
  page: {
    number,
    size: 20,
    totalElements: totalPages * 20,
    totalPages,
    hasPrevious: number > 1,
    hasNext: number < totalPages,
  },
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('result pagination uses 20-item pages, supports page buttons and recovers an out-of-range page', async () => {
  const fourthPage = deferred<Response>();
  const { requests } = installApiStub((request) => {
    if (request.url.pathname.endsWith('/test-runs/901')) {
      return apiSuccess({
        id: 901,
        testSuiteId: 7,
        status: 'FINISHED',
        testCaseCount: 200,
        progress: { processedTestCaseCount: 200, percent: 100 },
        target: {
          type: 'HTTP_ENDPOINT',
          identifier: 'https://example.com/v1/chat/completions',
          revision: null,
          model: 'test-model',
        },
        executionOutcome: 'COMPLETED',
        qualityGate: {
          status: 'PASS',
          metrics: {
            assertionPassRate: 1,
            executionSuccessRate: 1,
            assertion: { value: 1, threshold: 0.95, passed: true },
            execution: { value: 1, threshold: 0.95, passed: true },
          },
        },
        createdAt: '2026-09-06T00:00:00Z',
        startedAt: '2026-09-06T00:00:01Z',
        completedAt: '2026-09-06T00:01:00Z',
        updatedAt: '2026-09-06T00:01:00Z',
      });
    }
    if (request.url.pathname.endsWith('/test-runs/901/evaluator-metrics')) {
      return apiSuccess({
        truePositive: 200,
        trueNegative: 0,
        falsePositive: 0,
        falseNegative: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
      });
    }
    if (request.url.pathname.endsWith('/test-runs/901/results')) {
      const requestedPage = Number(request.url.searchParams.get('page'));
      if (requestedPage === 4) return fourthPage.promise;
      const response = pageResponse(requestedPage, requestedPage === 3 ? 3 : 10);
      return apiSuccess(requestedPage === 1 ? {
        ...response,
        facets: {
          allResults: 200,
          attentionTotal: 0,
          attentionTypes: {
            FALSE_NEGATIVE: 0,
            FALSE_POSITIVE: 0,
            EXECUTION_FAILED: 0,
            TIMED_OUT: 0,
            NOT_STARTED: 0,
          },
        },
      } : response);
    }
    throw new Error(`Unexpected API request: ${request.method} ${request.url.pathname}`);
  });

  const screen = await render(
    <ResultDetailView selectedRunId="901" onGoNewRun={vi.fn()} />,
  );

  const matrixHeading = screen.getByRole('heading', { name: '기대·관측 동작 매트릭스' });
  const resultListHeading = screen.getByRole('heading', { name: '결과 목록' });
  await expect.element(matrixHeading).toBeVisible();
  expect(
    matrixHeading.element().compareDocumentPosition(resultListHeading.element())
      & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

  const pageFour = screen.getByRole('button', { name: '4페이지' });
  const pagination = screen.getByRole('navigation', { name: '테스트 결과 페이지네이션' });
  await expect.element(pageFour).toBeVisible();
  await expect.element(screen.getByRole('button', { name: '이전' })).toBeDisabled();
  await expect.element(screen.getByRole('button', { name: '다음' })).toBeEnabled();
  await expect.element(screen.getByRole('button', { name: '1페이지' })).toHaveAttribute('aria-current', 'page');
  expect(pagination.element().textContent).toContain('…');
  await pageFour.click();

  await expect.poll(() => requests.filter(({ url }) => (
    url.pathname.endsWith('/test-runs/901/results') && url.searchParams.get('page') === '4'
  )).length).toBe(1);
  await expect.element(pagination).toBeVisible();
  await expect.element(screen.getByRole('button', { name: '1페이지' })).toHaveAttribute('aria-current', 'page');
  await expect.element(pageFour).toBeDisabled();
  await expect.element(screen.getByRole('status')).toHaveTextContent('· 불러오는 중');
  await expect.element(screen.getByText('테스트 케이스 1', { exact: true }).first()).toBeInTheDocument();
  fourthPage.resolve(apiSuccess(pageResponse(4, 3, [])));

  await expect.poll(() => requests.filter(({ url }) => (
    url.pathname.endsWith('/test-runs/901/results') && url.searchParams.get('page') === '3'
  )).length).toBe(1);
  await expect.element(screen.getByRole('button', { name: '3페이지' })).toHaveAttribute('aria-current', 'page');
  await expect.element(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  await expect.element(screen.getByText('테스트 케이스 3', { exact: true }).first()).toBeInTheDocument();
  await expect.element(screen.getByText('테스트 케이스 1', { exact: true }).first()).not.toBeInTheDocument();
  await expect.element(screen.getByRole('status')).not.toBeInTheDocument();

  const resultRequests = requests.filter(({ url }) => url.pathname.endsWith('/test-runs/901/results'));
  expect(resultRequests.map(({ url }) => [url.searchParams.get('page'), url.searchParams.get('size')])).toEqual([
    ['1', '20'],
    ['4', '20'],
    ['3', '20'],
  ]);
});
