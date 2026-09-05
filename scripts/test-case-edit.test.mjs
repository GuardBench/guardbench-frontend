import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modal = readFileSync(new URL('../src/components/common/SuiteDetailModal.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/testCaseService.ts', import.meta.url), 'utf8');

test('the test case edit button opens a form populated from the selected case', () => {
  assert.match(modal, /onClick=\{\(\) => openEditCase\(c\)\}/);
  assert.match(modal, /setEditCase\(\{[\s\S]*name: testCase\.name,[\s\S]*input: testCase\.input,[\s\S]*expectedAction: testCase\.expectedAction,[\s\S]*severity: testCase\.severity,[\s\S]*category: testCase\.category/);
  assert.match(modal, /editingCaseId === c\.id && editCase/);
  assert.match(modal, /TestCase 수정/);
  assert.doesNotMatch(modal, /편집 화면으로 이동합니다/);
});

test('the edit form submits every editable field through the PATCH service', () => {
  assert.match(modal, /await updateTestCase\(cleanCaseId, payload\)/);
  for (const field of ['name', 'input', 'category', 'expectedAction', 'severity']) {
    assert.match(modal, new RegExp(`${field}: editCase\\.${field}|${field},`));
  }
  assert.match(service, /`\/test-cases\/\$\{testCaseId\}`[\s\S]*method: 'PATCH'/);
  assert.match(modal, /setReloadToken\(\(token\) => token \+ 1\)/);
});

test('editing validates required values and preserves the draft on request failure', () => {
  assert.match(modal, /if \(!name\)[\s\S]*failEditValidation\('name'/);
  assert.match(modal, /if \(!input\)[\s\S]*failEditValidation\('input'/);
  assert.match(modal, /if \(!category\)[\s\S]*failEditValidation\('category'/);
  assert.match(modal, /failEditValidation\('request', presented\.message\)/);
  assert.match(modal, /role="alert"/);

  const catchBlock = modal.slice(modal.indexOf("const presented = presentApiError(error, `'${name}' 수정에 실패했습니다.`)"));
  assert.doesNotMatch(catchBlock.slice(0, catchBlock.indexOf('const handleDeleteCase')), /setEditCase\(null\)/);
});

test('editing supports cancellation and guards duplicate submissions', () => {
  assert.match(modal, /if \(!editingCaseId \|\| !editCase \|\| editInFlightRef\.current\) return/);
  assert.match(modal, /editInFlightRef\.current = true/);
  assert.match(modal, /onClick=\{cancelEditCase\}/);
  assert.match(modal, /disabled=\{isSavingEdit\}/);
  assert.match(modal, /aria-describedby=\{editValidation\?\.field === 'name'/);
});
