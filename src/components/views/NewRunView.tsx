import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { createTestRun } from '../../services/testRunService';
import { getTestSuites } from '../../services/testSuiteService';
import { RequestErrorBanner } from '../common/RequestErrorBanner';

interface NewRunViewProps {
  onNotify: (msg: string) => void;
  onRunCreated?: (runId: string) => void;
}

export const NewRunView: React.FC<NewRunViewProps> = ({ onNotify, onRunCreated }) => {
  // TestSuite 선택 — API에서 로드한 목록 사용
  const [suiteOptions, setSuiteOptions] = useState<Array<{ id: number; name: string; caseCount: number }>>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<number>(0);
  const [isSuiteLoading, setIsSuiteLoading] = useState(true);
  const [suiteLoadError, setSuiteLoadError] = useState<unknown>(null);
  const [suiteReloadToken, setSuiteReloadToken] = useState(0);

  // Baseline — guardrailId + numbered version
  const [guardrailId, setGuardrailId] = useState('');
  const [baselineVersion, setBaselineVersion] = useState('');

  // Candidate — 같은 guardrailId, source는 항상 DRAFT (ADR 0007)
  // guardrailId는 Baseline과 동일하게 사용

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  // TestSuite 목록 로드
  useEffect(() => {
    let isMounted = true;
    const fetchSuites = async () => {
      setIsSuiteLoading(true);
      setSuiteLoadError(null);
      try {
        const res = await getTestSuites({ size: 100 });
        if (isMounted && res.items) {
          const options = res.items.map((item) => ({
            id: Number(item.id),
            name: item.name,
            caseCount: item.testCaseCount ?? 0,
          }));
          setSuiteOptions(options);
          setSelectedSuiteId(options[0]?.id ?? 0);
        }
      } catch (error) {
        if (isMounted) {
          setSuiteLoadError(error);
        }
      } finally {
        if (isMounted) setIsSuiteLoading(false);
      }
    };
    fetchSuites();
    return () => { isMounted = false; };
  }, [suiteReloadToken]);

  const selectedSuite = suiteOptions.find((s) => s.id === selectedSuiteId);
  const caseCount = selectedSuite?.caseCount ?? 0;

  const handleRun = async () => {
    // 입력 검증
    if (!selectedSuiteId) {
      onNotify('테스트 스위트를 선택해 주세요.');
      return;
    }
    if (!guardrailId.trim()) {
      onNotify('Guardrail ID를 입력해 주세요.');
      return;
    }
    if (!baselineVersion.trim() || !/^[0-9]+$/.test(baselineVersion.trim())) {
      onNotify('Baseline Version은 숫자만 입력할 수 있습니다 (예: 1, 2, 3).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createTestRun({
        testSuiteId: selectedSuiteId,
        baseline: {
          guardrailId: guardrailId.trim(),
          version: baselineVersion.trim(),
        },
        candidate: {
          guardrailId: guardrailId.trim(),
          source: 'DRAFT',
        },
      });

      onNotify(`새 테스트 실행 #${res.id} 요청이 접수되었습니다. (${res.testCaseCount}개 케이스)`);
      if (onRunCreated) {
        onRunCreated(String(res.id));
      }
    } catch (err) {
      setSubmitError(err);
      const errorMsg = err instanceof Error ? err.message : '요청 실패';
      onNotify(`[실행 실패] ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 animate-rise">
      {/* Header */}
      <div>
        <div className="text-[#1a7f5a] text-xs font-black tracking-widest uppercase mb-1.5">New regression test</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17202a]">새 테스트 실행</h1>
        <p className="text-[#697586] text-sm mt-1.5 leading-relaxed">
          운영 버전과 변경 예정 DRAFT를 동일한 테스트 정의로 비교합니다.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6 items-start">
        {/* Form Card */}
        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-6 sm:p-8 shadow-[0_3px_15px_rgba(17,31,44,0.025)] space-y-6 divide-y divide-[#e5e9ee]">
          {/* Section 1 — TestSuite 선택 */}
          <div>
            <h3 className="text-base font-bold text-[#17202a]">1. 테스트 범위</h3>
            <p className="text-xs text-[#697586] mt-1 mb-4">
              실행할 TestSuite를 선택하면 포함된 TestCase가 Snapshot으로 복제됩니다.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#4e5a68] mb-2">테스트 스위트</label>
              {suiteLoadError !== null && (
                <div className="mb-3">
                  <RequestErrorBanner
                    error={suiteLoadError}
                    fallbackMessage="테스트 스위트 목록을 불러오지 못했습니다."
                    stale={suiteOptions.length > 0}
                    onRetry={() => setSuiteReloadToken((token) => token + 1)}
                  />
                </div>
              )}
              {isSuiteLoading ? (
                <div className="text-xs text-[#697586]">스위트 목록을 불러오는 중...</div>
              ) : suiteOptions.length === 0 ? (
                suiteLoadError === null ? (
                  <div className="text-xs text-[#697586]">등록된 테스트 스위트가 없습니다. 먼저 스위트를 생성해 주세요.</div>
                ) : null
              ) : (
                <select
                  value={selectedSuiteId}
                  onChange={(e) => setSelectedSuiteId(Number(e.target.value))}
                  className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-white text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10"
                >
                  {suiteOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} · {opt.caseCount} cases
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Section 2 — Baseline Target */}
          <div className="pt-6">
            <h3 className="text-base font-bold text-[#17202a]">2. Baseline Target</h3>
            <p className="text-xs text-[#697586] mt-1 mb-4">
              현재 운영 기준으로 사용하는 numbered Guardrail Version입니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4e5a68] mb-2">Guardrail ID</label>
                <input
                  value={guardrailId}
                  onChange={(e) => setGuardrailId(e.target.value)}
                  placeholder="예: 5fhc7mmi6k6b"
                  className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-white text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4e5a68] mb-2">Version (숫자)</label>
                <input
                  value={baselineVersion}
                  onChange={(e) => setBaselineVersion(e.target.value)}
                  placeholder="예: 1"
                  className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-white text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10"
                />
              </div>
            </div>
          </div>

          {/* Section 3 — Candidate Target */}
          <div className="pt-6">
            <h3 className="text-base font-bold text-[#17202a]">3. Candidate Target</h3>
            <p className="text-xs text-[#697586] mt-1 mb-4">
              Candidate는 위에서 지정한 같은 Guardrail의 DRAFT를 사용합니다.
              실행 전 DRAFT를 numbered Version으로 materialize합니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-[#4e5a68] mb-2">Guardrail ID</label>
                <input
                  value={guardrailId || '(Baseline과 동일)'}
                  disabled
                  className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-[#f8f9fa] text-sm text-[#697586] outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4e5a68] mb-2">Source</label>
                <input
                  value="DRAFT"
                  disabled
                  className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-[#f8f9fa] text-sm text-[#697586] font-mono outline-none cursor-not-allowed"
                />
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#fff7e8] text-[#78501b] text-xs leading-relaxed">
              Candidate DRAFT를 직접 실행하지 않습니다. 불변 버전으로 materialize한 뒤 Baseline과 동일 Snapshot으로 실행합니다.
            </div>
          </div>
        </article>

        {/* Summary Card */}
        <aside className="bg-white border border-[#e5e9ee] rounded-2xl p-6 shadow-[0_3px_15px_rgba(17,31,44,0.025)] sticky top-24 space-y-4">
          <h3 className="text-base font-bold text-[#17202a] pb-2 border-b border-[#e5e9ee]">실행 요약</h3>
          <div className="space-y-3 text-xs divide-y divide-[#e5e9ee]">
            <div className="flex justify-between pt-2">
              <span className="text-[#697586]">TestSuite</span>
              <b className="text-[#17202a]">{selectedSuite?.name || '—'}</b>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-[#697586]">테스트 케이스</span>
              <b className="text-[#17202a]">{caseCount}개</b>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-[#697586]">예상 실행 수</span>
              <b className="text-[#17202a]">{caseCount * 2}회</b>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-[#697586]">Guardrail ID</span>
              <b className="text-[#17202a] font-mono text-[11px]">{guardrailId || '—'}</b>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-[#697586]">Baseline</span>
              <b className="text-[#17202a]">v{baselineVersion || '?'}</b>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-[#697586]">Candidate</span>
              <b className="text-[#17202a]">DRAFT</b>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#fff7e8] text-[#78501b] text-[11px] leading-relaxed">
            실행 요청 후 Target과 Snapshot은 변경할 수 없습니다. 예상 소요 시간은 약 1–2분입니다.
          </div>

          {submitError !== null && (
            <RequestErrorBanner
              error={submitError}
              fallbackMessage="테스트 실행 요청에 실패했습니다."
            />
          )}

          <button
            onClick={handleRun}
            disabled={isSubmitting || !selectedSuiteId || !guardrailId.trim() || !baselineVersion.trim()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a7f5a] text-white text-sm font-bold shadow-sm hover:bg-[#146648] transition-all disabled:opacity-50"
          >
            <Play size={16} /> {isSubmitting ? '실행 요청 중...' : '테스트 실행 요청'}
          </button>
        </aside>
      </div>
    </section>
  );
};
