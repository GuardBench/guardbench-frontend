import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { QualityGateMetricsChart } from '../../src/components/views/QualityGateMetricsChart';
import type { QualityGateMetricsRes, TestRunListItemRes } from '../../src/services/testRunService';

const metrics = (
  assertionValue: number,
  executionValue: number,
  assertionThreshold = 0.95,
  executionThreshold = 0.95,
): QualityGateMetricsRes => ({
  assertionPassRate: assertionValue,
  executionSuccessRate: executionValue,
  assertion: {
    value: assertionValue,
    threshold: assertionThreshold,
    passed: assertionValue >= assertionThreshold,
  },
  execution: {
    value: executionValue,
    threshold: executionThreshold,
    passed: executionValue >= executionThreshold,
  },
});

const run = (
  id: number,
  qualityGateMetrics: QualityGateMetricsRes | null,
  qualityGateStatus: TestRunListItemRes['qualityGateStatus'] = qualityGateMetrics ? 'FAIL' : null,
): TestRunListItemRes => ({
  id,
  testSuiteId: 1,
  status: qualityGateStatus ? 'FINISHED' : 'RUNNING',
  testCaseCount: 10,
  progress: { processedTestCaseCount: qualityGateStatus ? 10 : 3, percent: qualityGateStatus ? 100 : 30 },
  executionOutcome: qualityGateStatus ? 'COMPLETED' : null,
  qualityGateStatus,
  qualityGateMetrics,
  createdAt: `2026-09-06T0${id}:00:00Z`,
  startedAt: null,
  completedAt: null,
  updatedAt: `2026-09-06T0${id}:00:00Z`,
});

test('renders the latest four runs with two bars whose heights follow their metric values', async () => {
  const screen = await render(
    <QualityGateMetricsChart
      runs={[
        run(4, metrics(0.25, 0.8, 0.2, 0.75), 'PASS'),
        run(3, metrics(0.6, 1)),
        run(2, metrics(0.9, 0.95)),
        run(1, metrics(1, 1), 'PASS'),
        run(0, metrics(1, 1), 'PASS'),
      ]}
    />,
  );

  await expect.element(screen.getByRole('group', { name: '실행 #4' })).toBeVisible();
  await expect.element(screen.getByRole('group', { name: '실행 #1' })).toBeVisible();
  await expect.element(screen.getByRole('group', { name: '실행 #0' })).not.toBeInTheDocument();

  const assertionBar = screen.getByRole('meter', { name: /실행 #4 기대 25\.0%, 기준 20\.0%, 기준 충족/ });
  const executionBar = screen.getByRole('meter', { name: /실행 #4 실행 80\.0%, 기준 75\.0%, 기준 충족/ });
  await expect.element(assertionBar).toBeVisible();
  await expect.element(executionBar).toBeVisible();
  expect(assertionBar.element().getBoundingClientRect().height)
    .toBeLessThan(executionBar.element().getBoundingClientRect().height);
});

test.each([
  { status: 'NOT_EVALUATED' as const, message: '지표 없음', pill: '평가 불가' },
  { status: null, message: '평가 전', pill: '실행 중' },
])('shows $message instead of inventing bars when metrics are absent', async ({ status, message, pill }) => {
  const screen = await render(<QualityGateMetricsChart runs={[run(4, null, status)]} />);

  await expect.element(screen.getByText(message)).toBeVisible();
  await expect.element(screen.getByText(pill)).toBeVisible();
  await expect.element(screen.getByRole('meter')).not.toBeInTheDocument();
});

test('keeps the latest three runs visible on a narrow viewport', async () => {
  await page.viewport(375, 900);
  try {
    const screen = await render(
      <QualityGateMetricsChart
        runs={[
          run(4, metrics(1, 1), 'PASS'),
          run(3, metrics(1, 1), 'PASS'),
          run(2, metrics(1, 1), 'PASS'),
          run(1, metrics(1, 1), 'PASS'),
        ]}
      />,
    );

    await expect.element(screen.getByRole('group', { name: '실행 #4' })).toBeVisible();
    await expect.element(screen.getByRole('group', { name: '실행 #2' })).toBeVisible();
    const oldestRun = document.querySelector<HTMLElement>('[aria-label="실행 #1"]');
    expect(oldestRun).not.toBeNull();
    expect(getComputedStyle(oldestRun!).display).toBe('none');
  } finally {
    await page.viewport(1280, 900);
  }
});
