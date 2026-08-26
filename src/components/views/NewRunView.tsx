import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { createTestRun } from '../../services/testRunService';

interface NewRunViewProps {
  onNotify: (msg: string) => void;
  onRunCreated?: (runId: string) => void;
}

export const NewRunView: React.FC<NewRunViewProps> = ({ onNotify, onRunCreated }) => {
  const [suiteId, setSuiteId] = useState('suite-cs-safety-01');
  const [suiteOption, setSuiteOption] = useState('Customer Support Safety|24');
  
  const [baselineGuardrailId, setBaselineGuardrailId] = useState('5fhc7mmi6k6b');
  const [baselineGuardrailVersion, setBaselineGuardrailVersion] = useState('1');
  
  const [candidateGuardrailId, setCandidateGuardrailId] = useState('x75oniydy7uf');
  const [candidateGuardrailVersion, setCandidateGuardrailVersion] = useState('5');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [suiteName, caseCountStr] = suiteOption.split('|');
  const caseCount = Number(caseCountStr);

  const handleRun = async () => {
    setIsSubmitting(true);
    try {
      const res = await createTestRun({
        suiteId,
        baselineGuardrailId,
        baselineGuardrailVersion,
        candidateGuardrailId,
        candidateGuardrailVersion,
      });

      onNotify(`새 테스트 실행 #${res.runId} 요청이 접수되었습니다.`);
      if (onRunCreated) {
        onRunCreated(res.runId);
      }
    } catch (err) {
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
          {/* Section 1 */}
          <div>
            <h3 className="text-base font-bold text-[#17202a]">1. 테스트 범위</h3>
            <p className="text-xs text-[#697586] mt-1 mb-4">
              실행할 TestSuite를 선택하면 포함된 TestCase가 Snapshot으로 복제됩니다.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#4e5a68] mb-2">테스트 스위트</label>
              <select
                value={suiteOption}
                onChange={(e) => {
                  setSuiteOption(e.target.value);
                  if (e.target.value.includes('Customer')) setSuiteId('suite-cs-safety-01');
                  else if (e.target.value.includes('Financial')) setSuiteId('suite-fin-basic-02');
                  else setSuiteId('suite-int-assistant-03');
                }}
                className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-white text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10"
              >
                <option value="Customer Support Safety|24">Customer Support Safety · 24 cases</option>
                <option value="Financial Advisor Basic|18">Financial Advisor Basic · 18 cases</option>
                <option value="Internal AI Assistant|31">Internal AI Assistant · 31 cases</option>
              </select>
            </div>
          </div>

          {/* Section 2 */}
          <div className="pt-6">
            <h3 className="text-base font-bold text-[#17202a]">2. Baseline Target</h3>
            <p className="text-xs text-[#697586] mt-1 mb-4">
              현재 운영 기준으로 사용하는 numbered Guardrail Version입니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4e5a68] mb-2">Guardrail ID</label>
                <input
                  value={baselineGuardrailId}
                  onChange={(e) => setBaselineGuardrailId(e.target.value)}
                  className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-white text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4e5a68] mb-2">Version</label>
                <input
                  value={baselineGuardrailVersion}
                  onChange={(e) => setBaselineGuardrailVersion(e.target.value)}
                  className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-white text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10"
                />
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="pt-6">
            <h3 className="text-base font-bold text-[#17202a]">3. Candidate Target</h3>
            <p className="text-xs text-[#697586] mt-1 mb-4">
              DRAFT는 실행 전 numbered Version으로 발행하고 configuration fingerprint를 검증합니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-[#4e5a68] mb-2">Guardrail ID</label>
                <input
                  value={candidateGuardrailId}
                  onChange={(e) => setCandidateGuardrailId(e.target.value)}
                  className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-white text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4e5a68] mb-2">Version / DRAFT</label>
                <input
                  value={candidateGuardrailVersion}
                  onChange={(e) => setCandidateGuardrailVersion(e.target.value)}
                  className="w-full border border-[#dce1e6] rounded-xl px-3.5 py-2.5 bg-white text-sm text-[#17202a] outline-none focus:border-[#1a7f5a] focus:ring-2 focus:ring-[#1a7f5a]/10"
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
              <b className="text-[#17202a]">{suiteName}</b>
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
              <span className="text-[#697586]">Baseline</span>
              <b className="text-[#17202a]">Version {baselineGuardrailVersion}</b>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-[#697586]">Candidate</span>
              <b className="text-[#17202a]">Version {candidateGuardrailVersion}</b>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#fff7e8] text-[#78501b] text-[11px] leading-relaxed">
            실행 요청 후 Target과 Snapshot은 변경할 수 없습니다. 예상 소요 시간은 약 1–2분입니다.
          </div>

          <button
            onClick={handleRun}
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a7f5a] text-white text-sm font-bold shadow-sm hover:bg-[#146648] transition-all disabled:opacity-50"
          >
            <Play size={16} /> {isSubmitting ? '실행 요청 중...' : '테스트 실행 요청'}
          </button>
        </aside>
      </div>
    </section>
  );
};
