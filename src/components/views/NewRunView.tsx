import React, { useEffect, useRef, useState } from 'react';
import { Play, ShieldCheck } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import { createTestRun } from '../../services/testRunService';
import { getTestSuites } from '../../services/testSuiteService';
import { RequestErrorBanner } from '../common/RequestErrorBanner';
import {
  buildCreateTestRunPayload,
  createTestRunPayloadFingerprint,
  parseQualityGatePolicy,
  type QualityGatePolicyField,
} from './newRunForm';

interface NewRunViewProps {
  onNotify: (msg: string) => void;
  onRunCreated?: (runId: string) => void;
}

type RunValidationField = 'suite' | 'endpoint' | 'model' | QualityGatePolicyField;

type RunValidation = {
  field: RunValidationField;
  message: string;
};

function isHttpEndpoint(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function submitErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'TEST_SUITE_EMPTY') {
    return '실행할 TestCase가 없습니다. 선택한 Suite에 TestCase를 추가해 주세요.';
  }
  if (error instanceof ApiError && error.code === 'IDEMPOTENCY_KEY_CONFLICT') {
    return '이전 요청과 충돌했습니다. 입력을 확인한 뒤 새로 시도해 주세요.';
  }
  return '테스트 실행 요청에 실패했습니다.';
}

function hasSubmitErrorMessage(error: unknown): error is ApiError {
  return error instanceof ApiError && [
    'TEST_SUITE_EMPTY',
    'IDEMPOTENCY_KEY_CONFLICT',
  ].includes(error.code);
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `guardbench-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const NewRunView: React.FC<NewRunViewProps> = ({ onNotify, onRunCreated }) => {
  const [suites, setSuites] = useState<Array<{ id: number; name: string; caseCount: number }>>([]);
  const [suiteId, setSuiteId] = useState(0);
  const [suiteLoading, setSuiteLoading] = useState(true);
  const [hasLoadedSuites, setHasLoadedSuites] = useState(false);
  const [suiteError, setSuiteError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [endpoint, setEndpoint] = useState('');
  const [revision, setRevision] = useState('');
  const [model, setModel] = useState('');
  const [assertionThresholdPercent, setAssertionThresholdPercent] = useState('');
  const [executionThresholdPercent, setExecutionThresholdPercent] = useState('');
  const [validation, setValidation] = useState<RunValidation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const idempotencyAttempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const suiteRef = useRef<HTMLSelectElement>(null);
  const endpointRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const assertionThresholdRef = useRef<HTMLInputElement>(null);
  const executionThresholdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setSuiteLoading(true);
      setSuiteError(null);
      try {
        const response = await getTestSuites({ size: 100 });
        if (!active) return;
        const options = response.items.map((item) => ({
          id: Number(item.id), name: item.name, caseCount: item.testCaseCount ?? 0,
        }));
        setSuites(options);
        setHasLoadedSuites(true);
        setSuiteId((current) => options.some((option) => option.id === current) ? current : (options[0]?.id ?? 0));
      } catch (error) {
        if (active) setSuiteError(error);
      } finally {
        if (active) setSuiteLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [reloadToken]);

  const selectedSuite = suites.find((suite) => suite.id === suiteId);
  const caseCount = selectedSuite?.caseCount ?? 0;
  const normalizedEndpoint = endpoint.trim();
  const normalizedRevision = revision.trim();
  const normalizedModel = model.trim();
  const parsedQualityGatePolicy = parseQualityGatePolicy({
    assertionThresholdPercent,
    executionThresholdPercent,
  });
  const canSubmit = !submitting && !suiteLoading && suites.length > 0;

  const failValidation = (field: RunValidationField, message: string) => {
    setValidation({ field, message });
    requestAnimationFrame(() => {
      const target = {
        suite: suiteRef.current,
        endpoint: endpointRef.current,
        model: modelRef.current,
        assertionThreshold: assertionThresholdRef.current,
        executionThreshold: executionThresholdRef.current,
      }[field];
      target?.focus();
    });
  };

  const handleRun = async () => {
    setValidation(null);
    setSubmitError(null);
    if (!suiteId) return failValidation('suite', '테스트 스위트를 선택해 주세요.');
    if (caseCount === 0) return failValidation('suite', '빈 Suite는 실행할 수 없습니다. TestCase를 먼저 추가해 주세요.');
    if (!isHttpEndpoint(normalizedEndpoint)) return failValidation('endpoint', 'http:// 또는 https://로 시작하는 유효한 Application URL을 입력해 주세요.');
    if (!normalizedModel) return failValidation('model', 'Application 요청에 사용할 Model 식별자를 입력해 주세요.');
    if (!parsedQualityGatePolicy.ok) return failValidation(parsedQualityGatePolicy.field, parsedQualityGatePolicy.message);

    setSubmitting(true);
    const payload = buildCreateTestRunPayload({
      testSuiteId: suiteId,
      endpoint: normalizedEndpoint,
      model: normalizedModel,
      revision: normalizedRevision,
      qualityGatePolicy: parsedQualityGatePolicy.policy,
    });
    const fingerprint = createTestRunPayloadFingerprint(payload);
    if (idempotencyAttempt.current?.fingerprint !== fingerprint) {
      idempotencyAttempt.current = { fingerprint, key: createIdempotencyKey() };
    }
    try {
      const response = await createTestRun(payload, idempotencyAttempt.current.key);
      idempotencyAttempt.current = null;
      onNotify(`새 테스트 실행 #${response.id} 요청이 접수되었습니다. (${response.testCaseCount}개 케이스)`);
      onRunCreated?.(String(response.id));
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== 'NETWORK_ERROR') {
        idempotencyAttempt.current = null;
      }
      setSubmitError(error);
      onNotify(`[실행 요청 실패] ${submitErrorMessage(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'w-full rounded-xl border border-[#dce1e6] bg-white px-3.5 py-2.5 text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10';

  return (
    <section className="space-y-6 animate-rise">
      <div>
        <div className="mb-1.5 text-xs font-black uppercase tracking-widest text-[#1a7f5a]">New application test</div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#17202a] sm:text-3xl">새 테스트 실행</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[#697586]">TestSuite의 기대 동작을 기준으로 AI Application의 현재 응답 행동을 테스트합니다.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="divide-y divide-[#e5e9ee] space-y-6 rounded-2xl border border-[#e5e9ee] bg-white p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)] sm:p-8">
          <div>
            <h2 className="text-base font-bold text-[#17202a]">1. 테스트 범위</h2>
            <p className="mb-4 mt-1 text-xs text-[#697586]">활성 TestCase가 실행 시점에 Snapshot으로 고정됩니다.</p>
            {suiteError !== null && <div className="mb-3"><RequestErrorBanner error={suiteError} fallbackMessage="테스트 스위트 목록을 불러오지 못했습니다." stale={hasLoadedSuites} onRetry={() => setReloadToken((value) => value + 1)} /></div>}
            <label htmlFor="run-suite" className="mb-2 block text-xs font-bold text-[#4e5a68]">테스트 스위트</label>
            {suiteLoading && !hasLoadedSuites ? <p className="text-xs text-[#697586]">스위트 목록을 불러오는 중...</p> : suites.length === 0
              ? hasLoadedSuites && <p className="text-xs text-[#697586]">등록된 테스트 스위트가 없습니다. 먼저 스위트를 생성해 주세요.</p>
              : <select ref={suiteRef} id="run-suite" value={suiteId} onChange={(event) => { setSuiteId(Number(event.target.value)); setValidation(null); }} aria-invalid={validation?.field === 'suite'} aria-describedby={validation?.field === 'suite' ? 'run-validation-summary' : undefined} className={fieldClass}>
                {suites.map((suite) => <option key={suite.id} value={suite.id}>{suite.name} · {suite.caseCount} cases</option>)}
              </select>}
            {selectedSuite && caseCount === 0 && <p className="mt-2 text-xs font-semibold text-[#9a5b13]">이 Suite에는 TestCase가 없어 실행할 수 없습니다.</p>}
          </div>

          <div className="pt-6">
            <h2 className="text-base font-bold text-[#17202a]">2. Application</h2>
            <p className="mb-4 mt-1 text-xs text-[#697586]">OpenAI-compatible Chat Completions endpoint와 요청에 사용할 Model을 입력합니다.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="run-endpoint" className="mb-2 block text-xs font-bold text-[#4e5a68]">HTTP Endpoint URL <span className="text-[#b83b34]">필수</span></label>
                <input ref={endpointRef} id="run-endpoint" type="url" value={endpoint} onChange={(event) => { setEndpoint(event.target.value); setValidation(null); }} aria-invalid={validation?.field === 'endpoint'} aria-describedby={validation?.field === 'endpoint' ? 'run-validation-summary' : undefined} placeholder="https://example.com/v1/chat/completions" className={fieldClass} />
                <p className="mt-1.5 text-[11px] text-[#697586]">OpenAI-compatible Chat Completions의 전체 HTTP 또는 HTTPS URL을 입력합니다.</p>
              </div>
              <div>
                <label htmlFor="run-model" className="mb-2 block text-xs font-bold text-[#4e5a68]">Model <span className="text-[#b83b34]">필수</span></label>
                <input ref={modelRef} id="run-model" value={model} onChange={(event) => { setModel(event.target.value); setValidation(null); }} aria-invalid={validation?.field === 'model'} aria-describedby={validation?.field === 'model' ? 'run-validation-summary' : undefined} placeholder="예: example-model" className={fieldClass} />
                <p className="mt-1.5 text-[11px] text-[#697586]">Application이 Chat Completions 요청 body에서 인식하는 모델 식별자입니다.</p>
              </div>
              <div>
                <label htmlFor="run-revision" className="mb-2 block text-xs font-bold text-[#4e5a68]">Revision <span className="font-normal text-[#697586]">선택</span></label>
                <input id="run-revision" value={revision} onChange={(event) => { setRevision(event.target.value); setValidation(null); }} placeholder="예: v2, model-2026-09, commit SHA" className={fieldClass} />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <h2 className="text-base font-bold text-[#17202a]">3. Quality Gate 기준</h2>
            <p className="mb-4 mt-1 text-xs text-[#697586]">이번 Test Run을 통과시키기 위한 최소 비율입니다. 두 값을 모두 비워두면 서버 기본 기준을 사용합니다.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="run-assertion-threshold" className="mb-2 block text-xs font-bold text-[#4e5a68]">기대 일치율 최소 기준 (%) <span className="font-normal text-[#697586]">선택</span></label>
                <input ref={assertionThresholdRef} id="run-assertion-threshold" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={assertionThresholdPercent} onChange={(event) => { setAssertionThresholdPercent(event.target.value); setValidation(null); }} aria-invalid={validation?.field === 'assertionThreshold'} aria-describedby={validation?.field === 'assertionThreshold' ? 'quality-gate-policy-help run-validation-summary' : 'quality-gate-policy-help'} placeholder="서버 기본값" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="run-execution-threshold" className="mb-2 block text-xs font-bold text-[#4e5a68]">실행 성공률 최소 기준 (%) <span className="font-normal text-[#697586]">선택</span></label>
                <input ref={executionThresholdRef} id="run-execution-threshold" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={executionThresholdPercent} onChange={(event) => { setExecutionThresholdPercent(event.target.value); setValidation(null); }} aria-invalid={validation?.field === 'executionThreshold'} aria-describedby={validation?.field === 'executionThreshold' ? 'quality-gate-policy-help run-validation-summary' : 'quality-gate-policy-help'} placeholder="서버 기본값" className={fieldClass} />
              </div>
            </div>
            <p id="quality-gate-policy-help" className="mt-2 text-[11px] text-[#697586]">직접 설정하려면 두 기준을 모두 입력해 주세요. 입력한 기준은 이 Run의 최종 판정 근거로 저장됩니다.</p>
          </div>
        </article>

        <aside className="sticky top-24 space-y-4 rounded-2xl border border-[#e5e9ee] bg-white p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <h2 className="border-b border-[#e5e9ee] pb-2 text-base font-bold text-[#17202a]">실행 요약</h2>
          <dl className="divide-y divide-[#e5e9ee] text-xs">
            <div className="flex justify-between gap-4 py-3"><dt className="text-[#697586]">TestSuite</dt><dd className="text-right font-bold">{selectedSuite?.name || '—'}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-[#697586]">예상 실행 수</dt><dd className="font-bold">{caseCount}회</dd></div>
            <div className="py-3"><dt className="text-[#697586]">Application</dt><dd className="mt-1 break-all font-bold">{normalizedEndpoint || '—'}</dd><dd className="mt-1 text-[10px] text-[#697586]">Model: {normalizedModel || '입력 필요'}</dd>{normalizedRevision && <dd className="mt-1 text-[10px] text-[#697586]">Revision: {normalizedRevision}</dd>}</div>
            <div className="py-3"><dt className="text-[#697586]">Quality Gate 기준</dt><dd className="mt-1 font-bold">{parsedQualityGatePolicy.ok && parsedQualityGatePolicy.policy ? `기대 일치율 ${assertionThresholdPercent.trim()}% · 실행 성공률 ${executionThresholdPercent.trim()}%` : parsedQualityGatePolicy.ok ? '서버 기본 기준' : '입력 확인 필요'}</dd></div>
          </dl>
          <div className="flex gap-2 rounded-xl bg-[#eef8f4] p-3.5 text-[11px] leading-relaxed text-[#27634f]"><ShieldCheck size={16} className="shrink-0" /><span>각 Snapshot은 Application에서 1회 실행됩니다. 응답 행동 분류는 GuardBench가 내부에서 일관되게 수행합니다.</span></div>
          {validation && <div id="run-validation-summary" className="rounded-xl border border-[#e7c47f] bg-[#fff7e8] px-4 py-3 text-xs font-semibold text-[#78501b]">{validation.message}</div>}
          {submitError !== null && <RequestErrorBanner
            error={submitError}
            fallbackMessage="테스트 실행 요청에 실패했습니다."
            messageOverride={hasSubmitErrorMessage(submitError) ? submitErrorMessage(submitError) : undefined}
          />}
          <button type="button" onClick={handleRun} disabled={!canSubmit} aria-describedby={validation ? 'run-validation-summary' : undefined} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a7f5a] py-3 text-sm font-bold text-white hover:bg-[#146648] disabled:cursor-not-allowed disabled:opacity-50"><Play size={16} />{submitting ? '실행 요청 중...' : '테스트 실행 요청'}</button>
        </aside>
      </div>
    </section>
  );
};
