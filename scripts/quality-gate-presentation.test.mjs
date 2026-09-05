import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/components/views/qualityGatePresentation.ts', import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
});
const presentation = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const metrics = (assertionPassed, executionPassed) => ({
  assertionPassRate: 0.9,
  executionSuccessRate: 0.98,
  assertion: { value: 0.9, threshold: 0.95, passed: assertionPassed },
  execution: { value: 0.98, threshold: 0.99, passed: executionPassed },
});

test('Gate 제목은 backend status만 사용한다', () => {
  assert.equal(presentation.qualityGateTitle(null), 'Quality Gate 평가 전');
  assert.equal(presentation.qualityGateTitle('NOT_EVALUATED'), 'Quality Gate 평가 불가');
  assert.equal(presentation.qualityGateTitle('PASS'), 'Quality Gate 통과');
  assert.equal(presentation.qualityGateTitle('FAIL'), 'Quality Gate 실패');
});

test('실패 이유는 value와 threshold를 재비교하지 않고 backend passed를 사용한다', () => {
  assert.deepEqual(presentation.failedQualityGateReasons(null), []);
  assert.deepEqual(presentation.failedQualityGateReasons(metrics(true, true)), []);
  assert.deepEqual(presentation.failedQualityGateReasons(metrics(false, true)), [
    '기대 동작과 일치한 결과 비율이 설정한 기준보다 낮습니다.',
  ]);
  assert.deepEqual(presentation.failedQualityGateReasons(metrics(true, false)), [
    '정상 처리된 테스트 비율이 설정한 기준보다 낮습니다.',
  ]);
  assert.equal(presentation.failedQualityGateReasons(metrics(false, false)).length, 2);

  const contradictoryEvidence = metrics(true, true);
  contradictoryEvidence.assertion.value = 0;
  contradictoryEvidence.assertion.threshold = 1;
  assert.deepEqual(presentation.failedQualityGateReasons(contradictoryEvidence), []);
});

test('결과 상세는 nested evidence를 표시하고 고정 95% 문구를 사용하지 않는다', () => {
  const source = readFileSync(new URL('../src/components/views/ResultDetailView.tsx', import.meta.url), 'utf8');
  assert.match(source, /metric=\{metrics\.assertion\}/);
  assert.match(source, /metric=\{metrics\.execution\}/);
  assert.match(source, /metric\.threshold/);
  assert.match(source, /metric\.passed/);
  assert.doesNotMatch(source, /기준 95%/);
});
