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

const {
  regressionChangeTypeLabel,
  regressionSummaryItems,
} = await import(compile('../src/components/views/regressionSummary.ts'));

const comparison = {
  regressedCount: 2,
  improvedCount: 1,
  unchangedCount: 74,
  notComparableCount: 1,
};

test('regression summary preserves backend counts including non-comparable cases', () => {
  assert.deepEqual(regressionSummaryItems(comparison), [
    { label: '악화', value: 2 },
    { label: '개선', value: 1 },
    { label: '변화 없음', value: 74 },
    { label: '비교 불가', value: 1 },
  ]);
});

test('regression summary displays a zero non-comparable count from the backend', () => {
  assert.deepEqual(regressionSummaryItems({ ...comparison, notComparableCount: 0 }), [
    { label: '악화', value: 2 },
    { label: '개선', value: 1 },
    { label: '변화 없음', value: 74 },
    { label: '비교 불가', value: 0 },
  ]);
});

test('regression case types use user-facing worsening labels', () => {
  assert.equal(regressionChangeTypeLabel('SECURITY_REGRESSION'), '보안 악화');
  assert.equal(regressionChangeTypeLabel('USABILITY_REGRESSION'), '사용성 악화');
  assert.equal(regressionChangeTypeLabel('IMPROVEMENT'), '개선');
  assert.equal(regressionChangeTypeLabel('NO_CHANGE'), '변화 없음');
  assert.equal(regressionChangeTypeLabel(null), '비교 불가');
});

test('summary and detail components only use type imports from regression services', () => {
  for (const path of [
    '../src/components/views/RegressionSummaryEntry.tsx',
    '../src/components/views/RegressionComparisonSection.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.ES2023, true, ts.ScriptKind.TSX);
    const valueImports = sourceFile.statements
      .filter((statement) => ts.isImportDeclaration(statement))
      .filter((statement) => statement.moduleSpecifier.text.includes('regressionService'))
      .filter((statement) => {
        const clause = statement.importClause;
        if (!clause || clause.isTypeOnly) return false;
        if (!clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) return true;
        return clause.namedBindings.elements.some((element) => !element.isTypeOnly);
      });
    assert.equal(valueImports.length, 0, `${path} must not own regression API calls`);
  }
});

const stateHelpers = await import(compile('../src/hooks/regressionComparisonState.ts'));

test('a loaded detail comparison is reused after a Result Detail round trip', () => {
  const key = stateHelpers.comparisonKey('901', '800');
  assert.equal(stateHelpers.shouldLoadComparison(key, '', ''), true);
  assert.equal(stateHelpers.shouldLoadComparison(key, key, ''), false);
});

test('Regression Detail uses the full comparison without requesting a duplicate summary', () => {
  const key = stateHelpers.comparisonKey('901', '800');
  assert.equal(stateHelpers.shouldLoadSummary(true, key, '', '', ''), false);
  assert.equal(stateHelpers.shouldLoadSummary(false, key, '', '', key), false);
  assert.equal(stateHelpers.shouldLoadSummary(false, key, '', '', ''), true);
});

test('candidate refresh preserves a selected baseline while it is still available', () => {
  assert.equal(stateHelpers.preserveSelectedCandidate('800', ['850', '800']), '800');
  assert.equal(stateHelpers.preserveSelectedCandidate('700', ['850', '800']), '850');
});

test('page refresh reloads candidates when no comparable Run has been found', () => {
  assert.equal(stateHelpers.shouldRefreshRegressionCandidates(0, false, false), true);
  assert.equal(stateHelpers.shouldRefreshRegressionCandidates(1, true, false), true);
  assert.equal(stateHelpers.shouldRefreshRegressionCandidates(1, false, true), true);
  assert.equal(stateHelpers.shouldRefreshRegressionCandidates(1, false, false), false);
});

test('a finished Run refreshes only its waiting Regression candidate lookup', () => {
  assert.equal(stateHelpers.shouldRefreshRegressionAfterRunFinished('901', '901', true), true);
  assert.equal(stateHelpers.shouldRefreshRegressionAfterRunFinished('901', '901', false), false);
  assert.equal(stateHelpers.shouldRefreshRegressionAfterRunFinished('901', '902', true), false);
});
