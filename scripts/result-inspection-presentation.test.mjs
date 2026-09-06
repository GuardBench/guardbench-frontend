import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/components/views/resultInspectionPresentation.ts', import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
});
const presentation = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const item = (overrides = {}) => ({
  testCaseSnapshotId: 1,
  name: 'case',
  input: 'input',
  expectedAction: 'BLOCK',
  severity: 'HIGH',
  category: 'PII',
  executionStatus: 'SUCCEEDED',
  evaluatorVerdict: 'ALLOW',
  assertionStatus: 'FAIL',
  evaluationOutcome: 'FALSE_NEGATIVE',
  attentionType: 'FALSE_NEGATIVE',
  error: null,
  ...overrides,
});

test('false negative and false positive guides stay grounded in category and expected behavior', () => {
  assert.deepEqual(presentation.resultInspectionGuide(item()), {
    summary: '이 TestCase는 PII 범주이며 차단이 기대되었지만, 대상 애플리케이션의 응답 행동은 허용으로 관측되었습니다.',
    action: '해당 범주의 애플리케이션 처리와 TestCase의 기대 동작이 적절한지 함께 확인하세요.',
  });
  assert.deepEqual(presentation.resultInspectionGuide(item({
    expectedAction: 'ALLOW',
    evaluatorVerdict: 'BLOCK',
    evaluationOutcome: 'FALSE_POSITIVE',
    attentionType: 'FALSE_POSITIVE',
  })), {
    summary: '이 TestCase는 PII 범주이며 허용이 기대되었지만, 대상 애플리케이션의 응답 행동은 차단으로 관측되었습니다.',
    action: '정상 요청이 제한되고 있는지와 TestCase의 기대 동작이 적절한지 함께 확인하세요.',
  });
});

test('execution failure guide distinguishes application target and evaluator stages', () => {
  assert.match(presentation.resultInspectionGuide(item({
    executionStatus: 'FAILED',
    evaluatorVerdict: null,
    assertionStatus: null,
    evaluationOutcome: null,
    attentionType: 'EXECUTION_FAILED',
    error: { stage: 'APPLICATION_TARGET', code: 'PROVIDER_UNAVAILABLE', message: 'safe' },
  })).summary, /대상 애플리케이션 실행 단계/);

  assert.match(presentation.resultInspectionGuide(item({
    executionStatus: 'FAILED',
    evaluatorVerdict: null,
    assertionStatus: null,
    evaluationOutcome: null,
    attentionType: 'EXECUTION_FAILED',
    error: { stage: 'EVALUATOR', code: 'PROVIDER_UNAVAILABLE', message: 'safe' },
  })).action, /GuardBench 판정 처리 상태/);
});

test('timeout and not-started guides do not invent a root cause', () => {
  const timedOut = presentation.resultInspectionGuide(item({ attentionType: 'TIMED_OUT', executionStatus: 'TIMED_OUT', evaluationOutcome: null }));
  const notStarted = presentation.resultInspectionGuide(item({ attentionType: 'NOT_STARTED', executionStatus: 'NOT_STARTED', evaluationOutcome: null }));
  assert.match(timedOut.summary, /시간 초과/);
  assert.match(notStarted.summary, /시작되지 않아/);
  for (const guide of [timedOut, notStarted]) {
    assert.doesNotMatch(`${guide.summary} ${guide.action}`, /네트워크|모델 설정|정책 오류/);
  }
});

test('normal TP and TN do not show a problem inspection guide', () => {
  assert.equal(presentation.resultInspectionGuide(item({ attentionType: null, evaluationOutcome: 'TRUE_POSITIVE', assertionStatus: 'PASS', evaluatorVerdict: 'BLOCK' })), null);
  assert.equal(presentation.resultInspectionGuide(item({ attentionType: null, evaluationOutcome: 'TRUE_NEGATIVE', assertionStatus: 'PASS', expectedAction: 'ALLOW' })), null);
});

test('result detail renders inspection guide as a dedicated section', () => {
  const source = readFileSync(new URL('../src/components/views/ResultDetailView.tsx', import.meta.url), 'utf8');
  assert.match(source, /resultInspectionGuide\(selected\)/);
  assert.match(source, />확인할 부분</);
});
