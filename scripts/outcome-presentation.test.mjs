import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/components/views/evaluationOutcomePresentation.ts', import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
});
const presentation = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('evaluation outcomes use meaning-first labels with technical codes as secondary information', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(presentation.EVALUATION_OUTCOME_PRESENTATION)
      .map(([outcome, value]) => [outcome, [value.label, value.shortCode]])),
    {
      TRUE_POSITIVE: ['정상 차단', 'TP'],
      TRUE_NEGATIVE: ['정상 허용', 'TN'],
      FALSE_POSITIVE: ['과차단', 'FP'],
      FALSE_NEGATIVE: ['차단 누락', 'FN'],
    },
  );
  assert.equal(presentation.evaluationOutcomeLabel('TRUE_NEGATIVE'), '정상 허용 (TN)');
  assert.equal(presentation.evaluationOutcomeLabel(null), '평가되지 않음');
});

test('result details distinguish expected, observed, assertion and outcome roles', () => {
  const source = readFileSync(new URL('../src/components/views/ResultDetailView.tsx', import.meta.url), 'utf8');
  for (const label of ['기대 동작', '관측된 동작', '기대 일치 여부', '판정 유형']) {
    assert.match(source, new RegExp(`>${label}<`));
  }
  for (const obsoleteLabel of ['Evaluator Verdict', 'Expected ALLOW', 'Expected BLOCK', 'Assertion / Outcome']) {
    assert.doesNotMatch(source, new RegExp(obsoleteLabel));
  }
});

test('regression detail labels comparison roles in user-facing Korean', () => {
  const source = readFileSync(new URL('../src/components/views/RegressionComparisonSection.tsx', import.meta.url), 'utf8');
  for (const label of ['테스트 케이스', '기대 동작', '과거 동작', '현재 동작', '변화', '비교 가능 여부']) {
    assert.match(source, new RegExp(`>${label}<`));
  }
});
