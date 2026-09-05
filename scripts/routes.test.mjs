import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/routing/routes.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
});
const {
  parseRoute,
  routeForView,
  routePath,
  selectedRunIdForRoute,
} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('valid routes retain their paths and exact Run IDs', () => {
  for (const path of ['/', '/suites', '/runs/new', '/runs', '/architecture', '/runs/901', '/runs/901/regression', '/runs/9223372036854775807']) {
    assert.equal(routePath(parseRoute(path)), path);
  }
  assert.deepEqual(parseRoute('/runs/%39%30%31'), { view: 'result', runId: '901' });
});

test('invalid IDs cannot reach result or regression views', () => {
  for (const id of ['901%23invalid', '..%2Ftest-suites', '901%3Fbad', '%252F', '%ZZ', '%E0%A4', 'abc', '0', '-1', '1.5', '1e3', '01', '9223372036854775808']) {
    for (const suffix of ['', '/regression']) {
      const pathname = `/runs/${id}${suffix}`;
      const route = parseRoute(pathname);
      assert.deepEqual(route, {
        view: 'invalid-run', pathname, sourceView: suffix ? 'regression' : 'result',
      });
      assert.equal(routePath(route), pathname);
      assert.equal('runId' in route, false);
    }
  }
});

test('the last selected Run remains available after visiting another view', () => {
  const resultRoute = parseRoute('/runs/901');
  const rememberedRunId = selectedRunIdForRoute(resultRoute, '');
  assert.equal(rememberedRunId, '901');

  const dashboardRoute = parseRoute('/');
  const selectedRunId = selectedRunIdForRoute(dashboardRoute, rememberedRunId);
  assert.equal(selectedRunId, '901');
  assert.deepEqual(routeForView('result', selectedRunId), { view: 'result', runId: '901' });
});

test('a newly selected Run replaces the remembered Run', () => {
  assert.equal(selectedRunIdForRoute(parseRoute('/runs/902/regression'), '901'), '902');
  assert.deepEqual(routeForView('result', ''), { view: 'runs' });
});
