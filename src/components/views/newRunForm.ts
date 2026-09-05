import type { CreateTestRunPayload, QualityGatePolicyReq } from '../../services/testRunService';

export type QualityGatePolicyField = 'assertionThreshold' | 'executionThreshold';

export interface QualityGatePolicyDraft {
  assertionThresholdPercent: string;
  executionThresholdPercent: string;
}

export const QUALITY_GATE_PERCENT_MIN = 0;
export const QUALITY_GATE_PERCENT_MAX = 100;

export type QualityGatePolicyParseResult =
  | { ok: true; policy: QualityGatePolicyReq | null }
  | { ok: false; field: QualityGatePolicyField; message: string };

export const parseQualityGatePercent = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed)
    && parsed >= QUALITY_GATE_PERCENT_MIN
    && parsed <= QUALITY_GATE_PERCENT_MAX
    ? parsed
    : null;
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

  const assertionPercent = parseQualityGatePercent(assertion);
  if (assertionPercent === null) {
    return { ok: false, field: 'assertionThreshold', message: '기대 일치율 기준은 0% 이상 100% 이하의 숫자로 입력해 주세요.' };
  }
  const executionPercent = parseQualityGatePercent(execution);
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

export const qualityGatePolicySummary = (
  draft: QualityGatePolicyDraft,
  showValidationError: boolean,
) => {
  const assertion = draft.assertionThresholdPercent.trim();
  const execution = draft.executionThresholdPercent.trim();
  if (!assertion && !execution) return '서버 기본 기준';

  const parsed = parseQualityGatePolicy(draft);
  if (!parsed.ok) return showValidationError ? '입력 확인 필요' : '기준 입력 중';

  return `기대 일치율 ${Number(assertion)}% · 실행 성공률 ${Number(execution)}%`;
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
