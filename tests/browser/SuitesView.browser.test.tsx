import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { SuitesView } from '../../src/components/views/SuitesView';
import { apiFailure, apiSuccess, deferred, installApiStub } from './support/apiStub';

const suiteList = (testCaseCount: number) => ({
  items: [{
    id: 7,
    name: '동기화 스위트',
    description: '개수 동기화 테스트',
    testCaseCount,
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
  }],
  page: {
    number: 1,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  },
});

const testCaseList = (totalElements = 1) => ({
  items: [{
    id: 41,
    testSuiteId: 7,
    name: '기존 케이스',
    input: '기존 입력',
    expectedAction: 'BLOCK',
    severity: 'HIGH',
    category: 'PII',
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
  }],
  page: {
    number: 1,
    size: 20,
    totalElements,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  },
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('successful TestCase mutations update the Suite card immediately and revalidate it', async () => {
  let suiteGetAttempt = 0;
  let testCaseGetAttempt = 0;
  const addRevalidation = deferred<Response>();
  const detailAddReload = deferred<Response>();

  const { requests } = installApiStub((request) => {
    if (request.method === 'GET' && request.url.pathname.endsWith('/test-suites')) {
      suiteGetAttempt += 1;
      if (suiteGetAttempt === 1) return apiSuccess(suiteList(1));
      if (suiteGetAttempt === 2) return addRevalidation.promise;
      return apiSuccess(suiteList(1));
    }
    if (request.method === 'GET' && request.url.pathname.endsWith('/test-suites/7/test-cases')) {
      testCaseGetAttempt += 1;
      if (testCaseGetAttempt === 1) return apiSuccess(testCaseList(1));
      if (testCaseGetAttempt === 2) return detailAddReload.promise;
      return apiSuccess(testCaseList(1));
    }
    if (request.method === 'POST' && request.url.pathname.endsWith('/test-suites/7/test-cases')) {
      return apiSuccess({
        id: 42,
        testSuiteId: 7,
        name: '추가 케이스',
        input: '추가 입력',
        expectedAction: 'ALLOW',
        severity: 'LOW',
        category: 'SAFE',
        createdAt: '2026-09-07T00:01:00Z',
        updatedAt: '2026-09-07T00:01:00Z',
      }, 201);
    }
    if (request.method === 'DELETE' && request.url.pathname.endsWith('/test-cases/41')) {
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected API request: ${request.method} ${request.url.pathname}`);
  });

  const screen = await render(<SuitesView onNotify={vi.fn()} />);
  const cardCount = screen.getByLabelText('동기화 스위트 테스트 케이스 수');
  await expect.element(cardCount).toHaveTextContent('1');
  await screen.getByRole('button', { name: /동기화 스위트/ }).click();
  await expect.element(screen.getByText('소속 테스트 케이스 목록 (1개)')).toBeVisible();

  await screen.getByRole('button', { name: '케이스 추가' }).click();
  await screen.getByLabelText('케이스 이름 *').fill('추가 케이스');
  await screen.getByLabelText('카테고리 *').fill('SAFE');
  await screen.getByLabelText('입력 프롬프트 (Input) *').fill('추가 입력');
  await screen.getByRole('button', { name: '저장하기' }).click();

  await expect.element(cardCount).toHaveTextContent('2');
  await expect.element(screen.getByText('소속 테스트 케이스 목록 (2개)')).toBeVisible();
  await expect.poll(() => requests.filter(({ url }) => url.pathname.endsWith('/test-suites')).length).toBe(2);
  addRevalidation.resolve(apiSuccess(suiteList(2)));
  detailAddReload.resolve(apiSuccess(testCaseList(2)));
  await expect.element(cardCount).toHaveTextContent('2');

  await screen.getByRole('button', { name: '기존 케이스 삭제' }).click();
  await expect.element(cardCount).toHaveTextContent('1');
  await expect.poll(() => requests.filter(({ method, url }) => method === 'GET' && url.pathname.endsWith('/test-suites')).length).toBe(3);
  await expect.element(cardCount).toHaveTextContent('1');
});

test('a failed TestCase mutation preserves the Suite card count', async () => {
  const { requests } = installApiStub((request) => {
    if (request.method === 'GET' && request.url.pathname.endsWith('/test-suites')) {
      return apiSuccess(suiteList(1));
    }
    if (request.method === 'GET' && request.url.pathname.endsWith('/test-suites/7/test-cases')) {
      return apiSuccess(testCaseList());
    }
    if (request.method === 'POST' && request.url.pathname.endsWith('/test-suites/7/test-cases')) {
      return apiFailure(503, 'TEMPORARY_FAILURE', '잠시 후 다시 시도해 주세요.');
    }
    throw new Error(`Unexpected API request: ${request.method} ${request.url.pathname}`);
  });

  const screen = await render(<SuitesView onNotify={vi.fn()} />);
  const cardCount = screen.getByLabelText('동기화 스위트 테스트 케이스 수');
  await expect.element(cardCount).toHaveTextContent('1');
  await screen.getByRole('button', { name: /동기화 스위트/ }).click();
  await screen.getByRole('button', { name: '케이스 추가' }).click();
  await screen.getByLabelText('케이스 이름 *').fill('실패 케이스');
  await screen.getByLabelText('카테고리 *').fill('SAFE');
  await screen.getByLabelText('입력 프롬프트 (Input) *').fill('실패 입력');
  await screen.getByRole('button', { name: '저장하기' }).click();

  await expect.element(screen.getByText('잠시 후 다시 시도해 주세요.')).toBeVisible();
  await expect.element(cardCount).toHaveTextContent('1');
  expect(requests.filter(({ method, url }) => method === 'GET' && url.pathname.endsWith('/test-suites'))).toHaveLength(1);
});

test('a failed Suite revalidation keeps the confirmed count and offers a retry', async () => {
  let suiteGetAttempt = 0;
  const { requests } = installApiStub((request) => {
    if (request.method === 'GET' && request.url.pathname.endsWith('/test-suites')) {
      suiteGetAttempt += 1;
      if (suiteGetAttempt === 1) return apiSuccess(suiteList(1));
      if (suiteGetAttempt === 2) return apiFailure(503, 'TEMPORARY_FAILURE', '목록 재검증에 실패했습니다.');
      return apiSuccess(suiteList(2));
    }
    if (request.method === 'GET' && request.url.pathname.endsWith('/test-suites/7/test-cases')) {
      return apiSuccess(testCaseList(requests.some(({ method }) => method === 'POST') ? 2 : 1));
    }
    if (request.method === 'POST' && request.url.pathname.endsWith('/test-suites/7/test-cases')) {
      return apiSuccess({
        id: 42,
        testSuiteId: 7,
        name: '추가 케이스',
        input: '추가 입력',
        expectedAction: 'ALLOW',
        severity: 'LOW',
        category: 'SAFE',
        createdAt: '2026-09-07T00:01:00Z',
        updatedAt: '2026-09-07T00:01:00Z',
      }, 201);
    }
    throw new Error(`Unexpected API request: ${request.method} ${request.url.pathname}`);
  });

  const screen = await render(<SuitesView onNotify={vi.fn()} />);
  const cardCount = screen.getByLabelText('동기화 스위트 테스트 케이스 수');
  await expect.element(cardCount).toHaveTextContent('1');
  await screen.getByRole('button', { name: /동기화 스위트/ }).click();
  await screen.getByRole('button', { name: '케이스 추가' }).click();
  await screen.getByLabelText('케이스 이름 *').fill('추가 케이스');
  await screen.getByLabelText('카테고리 *').fill('SAFE');
  await screen.getByLabelText('입력 프롬프트 (Input) *').fill('추가 입력');
  await screen.getByRole('button', { name: '저장하기' }).click();

  await expect.element(screen.getByText('최신 데이터를 불러오지 못해 이전 데이터를 표시합니다.')).toBeVisible();
  await expect.element(cardCount).toHaveTextContent('2');
  await screen.getByRole('button', { name: '닫기', exact: true }).click();
  await screen.getByRole('button', { name: '다시 시도' }).click();
  await expect.poll(() => requests.filter(({ method, url }) => method === 'GET' && url.pathname.endsWith('/test-suites')).length).toBe(3);
  await expect.element(cardCount).toHaveTextContent('2');
});
