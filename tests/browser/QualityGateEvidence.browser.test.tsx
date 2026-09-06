import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { QualityGateEvidence } from '../../src/components/views/QualityGateEvidence';
import type { QualityGateMetricsRes, QualityGateStatus } from '../../src/services/testRunService';

const metrics = (
  assertionPassed: boolean,
  executionPassed: boolean,
): QualityGateMetricsRes => ({
  assertionPassRate: 0.9,
  executionSuccessRate: 0.98,
  assertion: { value: 0.9, threshold: 0.95, passed: assertionPassed },
  execution: { value: 0.98, threshold: 0.98, passed: executionPassed },
});

const renderEvidence = (
  status: QualityGateStatus | null,
  gateMetrics: QualityGateMetricsRes | null,
  missingMetricsDescription?: string,
) => render(
  <QualityGateEvidence
    status={status}
    metrics={gateMetrics}
    summaryDescription="10건 중 1건을 확인해야 합니다."
    attentionDescription="판정 불일치 1건 · 판정 미완료 0건"
    missingMetricsDescription={missingMetricsDescription}
  >
    <div aria-label="판정 요약">판정 요약 내용</div>
  </QualityGateEvidence>,
);

test('failed Gate exposes metric evidence and an accessibly named failure region', async () => {
  const screen = await renderEvidence('FAIL', metrics(false, true));

  const card = screen.getByRole('article', { name: 'Quality Gate 실패' });
  await expect.element(card).toBeVisible();
  expect(getComputedStyle(card.element()).backgroundColor).toBe('rgb(255, 240, 239)');
  await expect.element(screen.getByText('10건 중 1건을 확인해야 합니다.')).toBeVisible();
  await expect.element(screen.getByText('판정 불일치 1건 · 판정 미완료 0건')).toBeVisible();
  await expect.element(screen.getByLabelText('판정 요약')).toHaveTextContent('판정 요약 내용');
  await expect.element(screen.getByLabelText('Quality Gate 판정 근거')).toBeVisible();
  await expect.element(screen.getByText('현재 90.00%')).toBeVisible();
  await expect.element(screen.getByText('최소 기준 95.00%')).toBeVisible();
  await expect.element(screen.getByText('현재 98.00%')).toBeVisible();
  await expect.element(screen.getByText('최소 기준 98.00%')).toBeVisible();
  await expect.element(screen.getByText('기준 미달')).toBeVisible();
  await expect.element(screen.getByText('기준 충족')).toBeVisible();

  const failureRegion = screen.getByRole('region', { name: '실패 이유' });
  await expect.element(failureRegion).toBeVisible();
  await expect.element(failureRegion.getByRole('listitem')).toHaveTextContent('기대 동작과 일치한 결과 비율이 설정한 기준보다 낮습니다.');
  await expect.element(failureRegion).not.toHaveTextContent('정상 처리된 테스트 비율이 설정한 기준보다 낮습니다.');
});

test('passed Gate trusts backend passed evidence instead of comparing values again', async () => {
  const contradictoryMetrics = metrics(true, true);
  contradictoryMetrics.assertion = { value: 0, threshold: 1, passed: true };
  const screen = await renderEvidence('PASS', contradictoryMetrics);

  const card = screen.getByRole('article', { name: 'Quality Gate 통과' });
  await expect.element(card).toBeVisible();
  expect(getComputedStyle(card.element()).backgroundColor).toBe('rgb(241, 250, 246)');
  await expect.element(screen.getByText('현재 0.00%')).toBeVisible();
  await expect.element(screen.getByText('최소 기준 100.00%')).toBeVisible();
  await expect.element(screen.getByText('기준 충족').first()).toBeVisible();
  await expect.element(screen.getByRole('region', { name: '실패 이유' })).not.toBeInTheDocument();
});

test.each([
  {
    status: 'NOT_EVALUATED' as const,
    title: 'Quality Gate 평가 불가',
    message: '기대 일치 여부를 판정할 수 있는 결과가 없어 Quality Gate 지표를 계산하지 않았습니다.',
  },
  {
    status: null,
    title: 'Quality Gate 평가 전',
    message: '실행 종료 후 Quality Gate 지표가 결정됩니다.',
  },
])('$title 상태는 지표를 발명하지 않고 안내 문구를 표시한다', async ({ status, title, message }) => {
  const screen = await renderEvidence(status, null);

  await expect.element(screen.getByRole('article', { name: title })).toBeVisible();
  await expect.element(screen.getByText(message)).toBeVisible();
  await expect.element(screen.getByLabelText('Quality Gate 판정 근거')).not.toBeInTheDocument();
});

test('loading can override the status-based missing metrics description', async () => {
  const screen = await renderEvidence(null, null, 'Quality Gate 정보를 불러오는 중입니다.');

  await expect.element(screen.getByText('Quality Gate 정보를 불러오는 중입니다.')).toBeVisible();
  await expect.element(screen.getByText('실행 종료 후 Quality Gate 지표가 결정됩니다.')).not.toBeInTheDocument();
});
