import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const compile = (path, transform = source => source) => {
  const source = transform(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
};
const client = compile('../src/services/apiClient.ts', source => source.replace(
  "import { runtimeConfig } from '../config/runtimeConfig';",
  "const runtimeConfig = { apiBaseUrl: 'https://contract.test/api/v1' };",
));
const loadService = path => import(compile(path, source => source.replace("'./apiClient'", JSON.stringify(client))));
const runs = await loadService('../src/services/testRunService.ts');
const regression = await loadService('../src/services/regressionService.ts');
const target = { type: 'HTTP_ENDPOINT', identifier: 'https://application.test/v1/chat/completions', model: 'app-model', revision: null };
const page = { number: 1, size: 20, totalElements: 1, totalPages: 1, hasPrevious: false, hasNext: false };
const respond = (t, data, check = () => {}) => t.mock.method(globalThis, 'fetch', async (url, options) => {
  check(url, options);
  return new Response(JSON.stringify({ httpStatus: 200, message: 'OK', data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

test('creation sends only Suite and Application, preserving the idempotency key', async t => {
  const payload = { testSuiteId: 1, target: { type: target.type, identifier: target.identifier, model: target.model } };
  const response = { id: 901, ...payload, target, status: 'QUEUED', testCaseCount: 1, createdAt: '2026-09-04T00:00:00Z' };
  respond(t, response, (url, options) => {
    assert.equal(url, 'https://contract.test/api/v1/test-runs');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), payload);
    assert.equal(options.headers['Idempotency-Key'], 'attempt-1');
  });
  assert.deepEqual(await runs.createTestRun(payload, 'attempt-1'), response);
});

test('detail preserves absent and unevaluated Gate states without inventing a profile', async t => {
  const detail = { id: 901, testSuiteId: 1, target, status: 'FINISHED', testCaseCount: 1,
    progress: { processedTestCaseCount: 1, percent: 100 }, executionOutcome: 'COMPLETED',
    createdAt: '2026-09-04T00:00:00Z', startedAt: null, completedAt: null, updatedAt: '2026-09-04T00:00:00Z' };
  for (const qualityGate of [null, { status: 'NOT_EVALUATED', metrics: null },
    { status: 'FAIL', metrics: { assertionPassRate: 0.5, executionSuccessRate: 1 } }]) {
    const response = { ...detail, qualityGate };
    respond(t, response);
    assert.deepEqual(await runs.getTestRunDetail(901), response);
    t.mock.restoreAll();
  }
});

test('comparable runs retain pagination and Application metadata without a profile', async t => {
  const response = { items: [{ id: 851, testSuiteId: 1, target, completedAt: '2026-09-03T00:00:00Z' }], page };
  respond(t, response, url => assert.equal(url, 'https://contract.test/api/v1/test-runs/901/comparable-runs?page=1&size=20'));
  assert.deepEqual(await regression.getComparableTestRuns(901, { page: 1, size: 20 }), response);
});

test('result actions, assertions and comparison classifications remain backend values', async t => {
  const result = { items: [{ testCaseSnapshotId: 1, name: 'case', input: 'prompt', expectedAction: 'BLOCK',
    severity: 'HIGH', category: 'test', executionStatus: 'SUCCEEDED', evaluatorVerdict: 'ALLOW',
    assertionStatus: 'FAIL', evaluationOutcome: 'FALSE_NEGATIVE', attentionType: 'FALSE_NEGATIVE', error: null }], page };
  respond(t, result);
  assert.deepEqual(await runs.getTestRunResults(901), result);
  t.mock.restoreAll();
  const comparison = { currentRunId: 901, comparisonRunId: 851, totalCases: 1, changedCount: 1,
    unchangedCount: 0, improvedCount: 0, regressedCount: 1, notComparableCount: 0,
    items: [{ snapshotId: 1, testCaseId: 1, name: 'case', input: 'prompt', expectedAction: 'BLOCK',
      comparisonVerdict: 'BLOCK', currentVerdict: 'ALLOW', comparabilityStatus: 'COMPARABLE', changeType: 'SECURITY_REGRESSION' }] };
  respond(t, comparison, url => assert.equal(url, 'https://contract.test/api/v1/test-runs/901/comparisons/851'));
  assert.deepEqual(await regression.getTestRunComparison(901, 851), comparison);
});
