import type { CreateTestRunPayload, QualityGatePolicyReq } from '../../services/testRunService';

export type QualityGatePolicyField = 'assertionThreshold' | 'executionThreshold';

export interface QualityGatePolicyDraft {
  assertionThresholdPercent: string;
  executionThresholdPercent: string;
}

export type QualityGatePolicyParseResult =
  | { ok: true; policy: QualityGatePolicyReq | null }
  | { ok: false; field: QualityGatePolicyField; message: string };

const parsePercent = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
};

export const parseQualityGatePolicy = ({
  assertionThresholdPercent,
  executionThresholdPercent,
}: QualityGatePolicyDraft): QualityGatePolicyParseResult => {
  const assertion = assertionThresholdPercent.trim();
  const execution = executionThresholdPercent.trim();

  if (!assertion && !execution) return { ok: true, policy: null };
  if (!assertion) {
    return { ok: false, field: 'assertionThreshold', message: '기대 일치율 기준을 입력하거나 두 기준을 모두 비워 주세요.' };
  }
  if (!execution) {
    return { ok: false, field: 'executionThreshold', message: '실행 성공률 기준을 입력하거나 두 기준을 모두 비워 주세요.' };
  }

  const assertionPercent = parsePercent(assertion);
  if (assertionPercent === null) {
    return { ok: false, field: 'assertionThreshold', message: '기대 일치율 기준은 0% 이상 100% 이하의 숫자로 입력해 주세요.' };
  }
  const executionPercent = parsePercent(execution);
  if (executionPercent === null) {
    return { ok: false, field: 'executionThreshold', message: '실행 성공률 기준은 0% 이상 100% 이하의 숫자로 입력해 주세요.' };
  }

  return {
    ok: true,
    policy: {
      assertionPassRateThreshold: assertionPercent / 100,
      executionSuccessRateThreshold: executionPercent / 100,
    },
  };
};

export const buildCreateTestRunPayload = ({
  testSuiteId,
  endpoint,
  model,
  revision,
  qualityGatePolicy,
}: {
  testSuiteId: number;
  endpoint: string;
  model: string;
  revision: string;
  qualityGatePolicy: QualityGatePolicyReq | null;
}): CreateTestRunPayload => ({
  testSuiteId,
  target: {
    type: 'HTTP_ENDPOINT',
    identifier: endpoint,
    ...(revision ? { revision } : {}),
    model,
  },
  ...(qualityGatePolicy ? { qualityGatePolicy } : {}),
});

export const createTestRunPayloadFingerprint = (payload: CreateTestRunPayload) => JSON.stringify(payload);
