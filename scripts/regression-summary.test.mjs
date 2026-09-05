import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const compile = (path) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
};

const { regressionSummaryItems } = await import(compile('../src/components/views/regressionSummary.ts'));

const comparison = {
  regressedCount: 2,
  improvedCount: 1,
  unchangedCount: 74,
  notComparableCount: 1,
};

test('regression summary preserves backend counts including non-comparable cases', () => {
  assert.deepEqual(regressionSummaryItems(comparison), [
    { label: 'Regression', value: 2 },
    { label: 'Improvement', value: 1 },
    { label: 'Unchanged', value: 74 },
    { label: '비교 불가', value: 1 },
  ]);
});

test('regression summary omits only a zero non-comparable count', () => {
  assert.deepEqual(regressionSummaryItems({ ...comparison, notComparableCount: 0 }), [
    { label: 'Regression', value: 2 },
    { label: 'Improvement', value: 1 },
    { label: 'Unchanged', value: 74 },
  ]);
});

test('summary and detail components do not own comparison API calls', () => {
  for (const path of [
    '../src/components/views/RegressionSummaryEntry.tsx',
    '../src/components/views/RegressionComparisonSection.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /getComparableTestRuns|getTestRunComparison/);
  }
});
