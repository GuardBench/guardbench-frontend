import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const presentationUrl = new URL('../src/components/views/applicationResponsePresentation.ts', import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(presentationUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
});
const presentation = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('application response presentation distinguishes missing, empty and stored responses', () => {
  assert.deepEqual(presentation.presentApplicationResponse(null), {
    available: false,
    displayText: null,
  });
  assert.deepEqual(presentation.presentApplicationResponse(''), {
    available: true,
    displayText: '(빈 응답)',
  });

  const raw = '<script>alert(1)</script>\n민감할 수 있는 원문';
  assert.deepEqual(presentation.presentApplicationResponse(raw), {
    available: true,
    displayText: raw,
  });
});

test('result detail service uses the approved snapshot detail endpoint and response field', () => {
  const source = readFileSync(new URL('../src/services/testRunService.ts', import.meta.url), 'utf8');
  assert.match(source, /interface TestRunResultDetailRes extends TestRunResultListItemRes/);
  assert.match(source, /applicationResponse: string \| null/);
  assert.match(source, /getTestRunResultDetail/);
  assert.match(source, /`\/test-runs\/\$\{testRunId\}\/results\/\$\{testCaseSnapshotId\}`/);
});

test('response evidence is collapsed, warns about content and renders text without HTML execution APIs', () => {
  const source = readFileSync(new URL('../src/components/views/ApplicationResponseEvidence.tsx', import.meta.url), 'utf8');
  for (const text of [
    '대상 애플리케이션 응답',
    '응답 내용 보기',
    '응답 내용 숨기기',
    '민감정보 또는 유해한 내용이 포함될 수 있습니다.',
    '저장된 대상 애플리케이션 응답이 없습니다.',
  ]) {
    assert.match(source, new RegExp(text));
  }
  assert.match(source, /useState\(false\)/);
  assert.match(source, /whitespace-pre-wrap/);
  assert.match(source, /break-words/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(source, /console\./);
});

test('Result Detail places response evidence before the inspection guide', () => {
  const source = readFileSync(new URL('../src/components/views/ResultDetailView.tsx', import.meta.url), 'utf8');
  const responseIndex = source.indexOf('<ApplicationResponseEvidence');
  const guideIndex = source.indexOf('{selectedInspectionGuide &&');
  assert.ok(responseIndex >= 0);
  assert.ok(guideIndex > responseIndex);
  assert.doesNotMatch(source, /Application 자연어 응답은 보안 정책에 따라 표시하지 않습니다/);
});
