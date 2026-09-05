import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/components/views/resultFilterPresentation.ts', import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
});
const presentation = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const emptyFilters = () => ({
  name: '',
  input: '',
  category: '',
  expectedAction: '',
  severity: '',
  executionStatus: '',
  assertionStatus: '',
  evaluationOutcome: 'ALL',
  sort: '',
});

test('결과 범위를 좁히는 각 필터와 정렬을 구분한다', () => {
  assert.equal(presentation.hasActiveResultFilter(emptyFilters(), 0), false);
  assert.equal(presentation.hasActiveResultFilter({ ...emptyFilters(), sort: 'name,asc' }, 0), false);
  assert.equal(presentation.hasActiveResultFilter(emptyFilters(), 1), true);

  for (const [key, value] of [
    ['name', 'case'],
    ['input', 'prompt'],
    ['category', 'security'],
    ['expectedAction', 'BLOCK'],
    ['severity', 'HIGH'],
    ['executionStatus', 'SUCCEEDED'],
    ['assertionStatus', 'PASS'],
    ['evaluationOutcome', 'TRUE_POSITIVE'],
  ]) {
    assert.equal(presentation.hasActiveResultFilter({ ...emptyFilters(), [key]: value }, 0), true, key);
  }
});

test('Snapshot 수 불일치는 필터 없는 전체 조회에서만 경고한다', () => {
  const mismatch = (filters, attentionTypeCount = 0) => presentation.hasUnfilteredResultCountMismatch({
    filters,
    attentionTypeCount,
    totalElements: 0,
    testCaseCount: 1,
  });

  assert.equal(mismatch(emptyFilters()), true);
  assert.equal(mismatch({ ...emptyFilters(), name: '없는 케이스' }), false);
  assert.equal(mismatch({ ...emptyFilters(), evaluationOutcome: 'FALSE_NEGATIVE' }), false);
  assert.equal(mismatch(emptyFilters(), 1), false);
  assert.equal(presentation.hasUnfilteredResultCountMismatch({
    filters: emptyFilters(), attentionTypeCount: 0, totalElements: 1, testCaseCount: 1,
  }), false);
});

test('필터 종류에 맞는 정상적인 0건 안내를 제공한다', () => {
  const message = (filters, attentionTypeCount = 0, resultCountMismatch = false) => (
    presentation.resultEmptyMessage({ filters, attentionTypeCount, resultCountMismatch })
  );

  assert.equal(message({ ...emptyFilters(), name: '없는 케이스' }), '현재 필터 조건에 해당하는 케이스가 없습니다.');
  assert.equal(message({ ...emptyFilters(), evaluationOutcome: 'FALSE_NEGATIVE' }), '이 판정 유형에 해당하는 결과가 없습니다.');
  assert.equal(message(emptyFilters(), 1), '선택한 확인 필요 유형에 해당하는 결과가 없습니다.');
  assert.equal(message({ ...emptyFilters(), severity: 'HIGH' }, 1), '현재 필터 조건에 해당하는 케이스가 없습니다.');
  assert.equal(message(emptyFilters(), 0, true), '결과 수 불일치를 확인해 주세요.');
  assert.equal(message(emptyFilters()), '표시할 결과가 없습니다.');
});
