import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { NewRunView } from '../../src/components/views/NewRunView';
import { apiSuccess, installApiStub } from './support/apiStub';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('shows the 95% server default without pre-filling a custom Quality Gate policy', async () => {
  installApiStub(() => apiSuccess({
    items: [{
      id: 1,
      name: '기본 정책 스위트',
      description: null,
      testCaseCount: 1,
      createdAt: '2026-09-06T00:00:00Z',
      updatedAt: '2026-09-06T00:00:00Z',
    }],
    page: {
      number: 1,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    },
  }));

  const screen = await render(<NewRunView onNotify={vi.fn()} />);
  const assertionThreshold = screen.getByLabelText('기대 일치율 최소 기준 (%) 선택');
  const executionThreshold = screen.getByLabelText('실행 성공률 최소 기준 (%) 선택');

  await expect.element(assertionThreshold).toHaveAttribute('placeholder', '서버 기본값 95%');
  await expect.element(executionThreshold).toHaveAttribute('placeholder', '서버 기본값 95%');
  await expect.element(assertionThreshold).toHaveValue(null);
  await expect.element(executionThreshold).toHaveValue(null);
});
