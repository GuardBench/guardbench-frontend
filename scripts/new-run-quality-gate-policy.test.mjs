import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/components/views/newRunForm.ts', import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
});
const form = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const parse = (assertionThresholdPercent, executionThresholdPercent) => form.parseQualityGatePolicy({
  assertionThresholdPercent,
  executionThresholdPercent,
});

test('두 기준을 모두 비우면 backend 기본 정책을 사용한다', () => {
  assert.deepEqual(parse('', ''), { ok: true, policy: null });
  assert.deepEqual(parse('  ', '  '), { ok: true, policy: null });
});

test('한 기준만 입력하면 나머지 기준 입력을 요청한다', () => {
  assert.deepEqual(parse('', '98'), {
    ok: false,
    field: 'assertionThreshold',
    message: '기대 일치율 기준을 입력하거나 두 기준을 모두 비워 주세요.',
  });
  assert.deepEqual(parse('90', ''), {
    ok: false,
    field: 'executionThreshold',
    message: '실행 성공률 기준을 입력하거나 두 기준을 모두 비워 주세요.',
  });
});

test('0~100% 범위와 유한한 숫자만 허용한다', () => {
  assert.equal(form.QUALITY_GATE_PERCENT_MIN, 0);
  assert.equal(form.QUALITY_GATE_PERCENT_MAX, 100);
  assert.equal(form.parseQualityGatePercent(''), null);
  assert.equal(form.parseQualityGatePercent('  '), null);
  assert.equal(parse('-0.01', '95').field, 'assertionThreshold');
  assert.equal(parse('95', '100.01').field, 'executionThreshold');
  assert.equal(parse('not-a-number', '95').field, 'assertionThreshold');
  assert.deepEqual(parse('0', '100'), {
    ok: true,
    policy: { assertionPassRateThreshold: 0, executionSuccessRateThreshold: 1 },
  });
});

test('요약은 입력 중과 제출 후 오류를 구분하고 유효한 숫자를 정규화한다', () => {
  const summary = (assertionThresholdPercent, executionThresholdPercent, showValidationError = false) => (
    form.qualityGatePolicySummary({ assertionThresholdPercent, executionThresholdPercent }, showValidationError)
  );
  assert.equal(summary('', ''), '서버 기본 기준');
  assert.equal(summary('9', ''), '기준 입력 중');
  assert.equal(summary('9', '', true), '입력 확인 필요');
  assert.equal(summary('101', '95'), '기준 입력 중');
  assert.equal(summary('101', '95', true), '입력 확인 필요');
  assert.equal(summary('090', '9.50'), '기대 일치율 90% · 실행 성공률 9.5%');
});

test('퍼센트를 API의 0~1 비율로 변환해 payload에 포함한다', () => {
  const parsed = parse('90', '98');
  assert.equal(parsed.ok, true);
  const payload = form.buildCreateTestRunPayload({
    testSuiteId: 7,
    endpoint: 'https://application.test/v1/chat/completions',
    model: 'app-model',
    revision: 'release-7',
    qualityGatePolicy: parsed.policy,
  });
  assert.deepEqual(payload, {
    testSuiteId: 7,
    target: {
      type: 'HTTP_ENDPOINT',
      identifier: 'https://application.test/v1/chat/completions',
      revision: 'release-7',
      model: 'app-model',
    },
    qualityGatePolicy: {
      assertionPassRateThreshold: 0.9,
      executionSuccessRateThreshold: 0.98,
    },
  });
});

test('정책을 생략한 payload에는 qualityGatePolicy를 만들지 않는다', () => {
  const payload = form.buildCreateTestRunPayload({
    testSuiteId: 7,
    endpoint: 'https://application.test/v1/chat/completions',
    model: 'app-model',
    revision: '',
    qualityGatePolicy: null,
  });
  assert.equal('qualityGatePolicy' in payload, false);
  assert.equal('revision' in payload.target, false);
});

test('동일 정책은 같은 fingerprint를 유지하고 정책이 바뀌면 fingerprint도 바뀐다', () => {
  const build = (assertionPassRateThreshold) => form.buildCreateTestRunPayload({
    testSuiteId: 7,
    endpoint: 'https://application.test/v1/chat/completions',
    model: 'app-model',
    revision: '',
    qualityGatePolicy: { assertionPassRateThreshold, executionSuccessRateThreshold: 0.98 },
  });
  const first = form.createTestRunPayloadFingerprint(build(0.9));
  assert.equal(form.createTestRunPayloadFingerprint(build(0.9)), first);
  assert.notEqual(form.createTestRunPayloadFingerprint(build(0.91)), first);
});
