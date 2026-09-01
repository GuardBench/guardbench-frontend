import React, { useEffect, useState } from 'react';
import { Play, ShieldCheck } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import {
  createTestRun,
  type EvaluationCheck,
  type EvaluationStrictness,
} from '../../services/testRunService';
import { getTestSuites } from '../../services/testSuiteService';
import { RequestErrorBanner } from '../common/RequestErrorBanner';

interface NewRunViewProps {
  onNotify: (msg: string) => void;
  onRunCreated?: (runId: string) => void;
}

const CHECK_OPTIONS: Array<{ value: EvaluationCheck; label: string; help: string }> = [
  { value: 'PROMPT_INJECTION', label: 'Prompt Injection', help: '지시 탈취나 우회 시도' },
  { value: 'PII_LEAKAGE', label: 'PII Leakage', help: '개인정보 노출 응답' },
  { value: 'HARMFUL_CONTENT', label: 'Harmful Content', help: '유해하거나 위험한 콘텐츠' },
];

const STRICTNESS_OPTIONS: Array<{ value: EvaluationStrictness; label: string; help: string }> = [
  { value: 'RELAXED', label: '완화', help: '명확한 위험 위주' },
  { value: 'STANDARD', label: '표준', help: 'MVP 기본 평가 수준' },
  { value: 'STRICT', label: '엄격', help: '의심 사례까지 보수적으로' },
];

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

export const NewRunView: React.FC<NewRunViewProps> = ({ onNotify, onRunCreated }) => {
  const [suites, setSuites] = useState<Array<{ id: number; name: string; caseCount: number }>>([]);
  const [suiteId, setSuiteId] = useState(0);
  const [suiteLoading, setSuiteLoading] = useState(true);
  const [suiteError, setSuiteError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [endpoint, setEndpoint] = useState('');
  const [revision, setRevision] = useState('');
  const [checks, setChecks] = useState<EvaluationCheck[]>(CHECK_OPTIONS.map((option) => option.value));
  const [strictness, setStrictness] = useState<EvaluationStrictness>('STANDARD');
  const [validation, setValidation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

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
  const canSubmit = !submitting && suiteId > 0 && caseCount > 0
    && isHttpEndpoint(normalizedEndpoint) && checks.length > 0;

  const toggleCheck = (check: EvaluationCheck) => {
    setChecks((current) => current.includes(check)
      ? current.filter((item) => item !== check)
      : [...current, check]);
    setValidation(null);
  };

  const handleRun = async () => {
    setValidation(null);
    setSubmitError(null);
    if (!suiteId) return setValidation('테스트 스위트를 선택해 주세요.');
    if (caseCount === 0) return setValidation('빈 Suite는 실행할 수 없습니다. TestCase를 먼저 추가해 주세요.');
    if (!isHttpEndpoint(normalizedEndpoint)) return setValidation('http:// 또는 https://로 시작하는 유효한 Application URL을 입력해 주세요.');
    if (revision.length > 0 && !normalizedRevision) return setValidation('Revision은 공백만 입력할 수 없습니다.');
    if (checks.length === 0) return setValidation('평가할 보안 항목을 하나 이상 선택해 주세요.');

    setSubmitting(true);
    try {
      const response = await createTestRun({
        testSuiteId: suiteId,
        target: {
          type: 'HTTP_ENDPOINT',
          identifier: normalizedEndpoint,
          ...(normalizedRevision ? { revision: normalizedRevision } : {}),
        },
        evaluationProfile: { checks, strictness },
      }, crypto.randomUUID());
      onNotify(`새 테스트 실행 #${response.id} 요청이 접수되었습니다. (${response.testCaseCount}개 케이스)`);
      onRunCreated?.(String(response.id));
    } catch (error) {
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
        <p className="mt-1.5 text-sm leading-relaxed text-[#697586]">AI Application을 호출하고 Evaluation Profile에 따라 안전성을 평가합니다.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="divide-y divide-[#e5e9ee] space-y-6 rounded-2xl border border-[#e5e9ee] bg-white p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)] sm:p-8">
          <div>
            <h2 className="text-base font-bold text-[#17202a]">1. 테스트 범위</h2>
            <p className="mb-4 mt-1 text-xs text-[#697586]">활성 TestCase가 실행 시점에 Snapshot으로 고정됩니다.</p>
            {suiteError !== null && <div className="mb-3"><RequestErrorBanner error={suiteError} fallbackMessage="테스트 스위트 목록을 불러오지 못했습니다." stale={suites.length > 0} onRetry={() => setReloadToken((value) => value + 1)} /></div>}
            <label htmlFor="run-suite" className="mb-2 block text-xs font-bold text-[#4e5a68]">테스트 스위트</label>
            {suiteLoading ? <p className="text-xs text-[#697586]">스위트 목록을 불러오는 중...</p> : suites.length === 0
              ? suiteError === null && <p className="text-xs text-[#697586]">등록된 테스트 스위트가 없습니다. 먼저 스위트를 생성해 주세요.</p>
              : <select id="run-suite" value={suiteId} onChange={(event) => { setSuiteId(Number(event.target.value)); setValidation(null); }} className={fieldClass}>
                {suites.map((suite) => <option key={suite.id} value={suite.id}>{suite.name} · {suite.caseCount} cases</option>)}
              </select>}
            {selectedSuite && caseCount === 0 && <p className="mt-2 text-xs font-semibold text-[#9a5b13]">이 Suite에는 TestCase가 없어 실행할 수 없습니다.</p>}
          </div>

          <div className="pt-6">
            <h2 className="text-base font-bold text-[#17202a]">2. Application</h2>
            <p className="mb-4 mt-1 text-xs text-[#697586]">테스트할 AI Application의 HTTP endpoint를 입력합니다.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="run-endpoint" className="mb-2 block text-xs font-bold text-[#4e5a68]">HTTP Endpoint URL <span className="text-[#b83b34]">필수</span></label>
                <input id="run-endpoint" type="url" value={endpoint} onChange={(event) => { setEndpoint(event.target.value); setValidation(null); }} placeholder="https://example.com/api/chat" className={fieldClass} />
                <p className="mt-1.5 text-[11px] text-[#697586]">HTTP 또는 HTTPS URL만 지원합니다.</p>
              </div>
              <div>
                <label htmlFor="run-revision" className="mb-2 block text-xs font-bold text-[#4e5a68]">Revision <span className="font-normal text-[#697586]">선택</span></label>
                <input id="run-revision" value={revision} onChange={(event) => { setRevision(event.target.value); setValidation(null); }} placeholder="예: v2, model-2026-09, commit SHA" className={fieldClass} />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <h2 className="text-base font-bold text-[#17202a]">3. Evaluation Profile</h2>
            <p className="mb-4 mt-1 text-xs text-[#697586]">평가 항목을 선택하고 모든 항목에 적용할 엄격도를 정합니다.</p>
            <fieldset>
              <legend className="mb-2 text-xs font-bold text-[#4e5a68]">Checks <span className="text-[#b83b34]">1개 이상</span></legend>
              <div className="grid gap-2 sm:grid-cols-3">{CHECK_OPTIONS.map((option) => <label key={option.value} className={`cursor-pointer rounded-xl border p-3 ${checks.includes(option.value) ? 'border-[#1a7f5a] bg-[#f0faf6]' : 'border-[#dce1e6]'}`}>
                <span className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={checks.includes(option.value)} onChange={() => toggleCheck(option.value)} className="accent-[#1a7f5a]" />{option.label}</span>
                <span className="mt-1.5 block pl-5 text-[10px] text-[#697586]">{option.help}</span>
              </label>)}</div>
            </fieldset>
            <fieldset className="mt-5">
              <legend className="mb-2 text-xs font-bold text-[#4e5a68]">통합 Strictness</legend>
              <div className="grid gap-2 sm:grid-cols-3">{STRICTNESS_OPTIONS.map((option) => <label key={option.value} className={`cursor-pointer rounded-xl border p-3 ${strictness === option.value ? 'border-[#1a7f5a] bg-[#f0faf6]' : 'border-[#dce1e6]'}`}>
                <span className="flex items-center gap-2 text-xs font-bold"><input type="radio" name="strictness" checked={strictness === option.value} onChange={() => setStrictness(option.value)} className="accent-[#1a7f5a]" />{option.label}</span>
                <span className="mt-1.5 block pl-5 text-[10px] text-[#697586]">{option.help}</span>
              </label>)}</div>
            </fieldset>
          </div>
        </article>

        <aside className="sticky top-24 space-y-4 rounded-2xl border border-[#e5e9ee] bg-white p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <h2 className="border-b border-[#e5e9ee] pb-2 text-base font-bold text-[#17202a]">실행 요약</h2>
          <dl className="divide-y divide-[#e5e9ee] text-xs">
            <div className="flex justify-between gap-4 py-3"><dt className="text-[#697586]">TestSuite</dt><dd className="text-right font-bold">{selectedSuite?.name || '—'}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-[#697586]">예상 실행 수</dt><dd className="font-bold">{caseCount}회</dd></div>
            <div className="py-3"><dt className="text-[#697586]">Application</dt><dd className="mt-1 break-all font-bold">{normalizedEndpoint || '—'}</dd>{normalizedRevision && <dd className="mt-1 text-[10px] text-[#697586]">Revision: {normalizedRevision}</dd>}</div>
            <div className="py-3"><dt className="text-[#697586]">Evaluation Profile</dt><dd className="mt-1 font-bold">{checks.length ? CHECK_OPTIONS.filter((option) => checks.includes(option.value)).map((option) => option.label).join(', ') : '선택 필요'}</dd><dd className="mt-1 text-[10px] text-[#697586]">Strictness: {strictness}</dd></div>
          </dl>
          <div className="flex gap-2 rounded-xl bg-[#eef8f4] p-3.5 text-[11px] leading-relaxed text-[#27634f]"><ShieldCheck size={16} className="shrink-0" /><span>각 Snapshot은 Application에서 1회 실행됩니다. Evaluator 설정은 GuardBench가 내부에서 관리합니다.</span></div>
          {validation && <div className="rounded-xl border border-[#e7c47f] bg-[#fff7e8] px-4 py-3 text-xs font-semibold text-[#78501b]">{validation}</div>}
          {submitError !== null && <RequestErrorBanner error={submitError} fallbackMessage={submitErrorMessage(submitError)} />}
          <button type="button" onClick={handleRun} disabled={!canSubmit} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a7f5a] py-3 text-sm font-bold text-white hover:bg-[#146648] disabled:cursor-not-allowed disabled:opacity-50"><Play size={16} />{submitting ? '실행 요청 중...' : '테스트 실행 요청'}</button>
        </aside>
      </div>
    </section>
  );
};
