import React from 'react';
import { mockRules } from '../../mocks/mockData';

export const ArchitectureView: React.FC = () => {
  return (
    <section className="space-y-6 animate-rise">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[#1a7f5a] text-xs font-black tracking-widest uppercase mb-1.5">System map</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17202a]">아키텍처 & 도메인</h1>
          <p className="text-[#697586] text-sm mt-1.5 leading-relaxed">
            정적 데모가 반영한 MVP 컴포넌트와 핵심 도메인 불변식입니다.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#cfe6dd] bg-[#f1faf6] text-[#1a7f5a] text-xs font-bold">
          정적 데모 자료 · Java · Spring Boot · AWS
        </span>
      </div>

      {/* Architecture Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-6">
        {/* Flow Stack */}
        <article className="bg-white border border-[#e5e9ee] rounded-2xl p-6 sm:p-8 shadow-[0_3px_15px_rgba(17,31,44,0.025)]">
          <h2 className="text-base font-bold text-[#17202a]">실행 흐름</h2>
          <p className="text-xs text-[#697586] mt-1 mb-6">REST 요청부터 Quality Gate 판정까지</p>

          <div className="space-y-3">
            <div className="border border-[#e5e9ee] bg-[#fbfcfc] rounded-xl p-3.5 flex justify-between items-center">
              <strong className="text-xs text-[#17202a]">사용자 / CI</strong>
              <span className="text-[10px] text-[#697586] font-mono">POST /api/v1/test-runs</span>
            </div>
            <div className="w-[1px] h-3 bg-[#cbd3da] mx-auto" />
            <div className="border border-[#e5e9ee] bg-[#fbfcfc] rounded-xl p-3.5 flex justify-between items-center">
              <strong className="text-xs text-[#17202a]">Spring Boot · Run Orchestrator</strong>
              <span className="text-[10px] text-[#697586]">Target resolve · Snapshot 고정</span>
            </div>
            <div className="w-[1px] h-3 bg-[#cbd3da] mx-auto" />
            <div className="border border-[#e5e9ee] bg-[#fbfcfc] rounded-xl p-3.5 flex justify-between items-center">
              <strong className="text-xs text-[#17202a]">Amazon SQS · Worker</strong>
              <span className="text-[10px] text-[#697586]">Snapshot 단위 비동기 실행</span>
            </div>
            <div className="w-[1px] h-3 bg-[#cbd3da] mx-auto" />
            <div className="border border-[#e5e9ee] bg-[#fbfcfc] rounded-xl p-3.5 flex justify-between items-center">
              <strong className="text-xs text-[#17202a]">응답 동작 판정</strong>
              <span className="text-[10px] text-[#697586]">관측된 동작 · ALLOW / BLOCK</span>
            </div>
            <div className="w-[1px] h-3 bg-[#cbd3da] mx-auto" />
            <div className="border border-[#e5e9ee] bg-[#fbfcfc] rounded-xl p-3.5 flex justify-between items-center">
              <strong className="text-xs text-[#17202a]">Evaluation Engine</strong>
              <span className="text-[10px] text-[#697586]">순수 도메인 판정</span>
            </div>
            <div className="w-[1px] h-3 bg-[#cbd3da] mx-auto" />
            <div className="border border-[#9dceb9] bg-[#f1faf6] rounded-xl p-3.5 flex justify-between items-center">
              <strong className="text-xs text-[#1a7f5a]">Quality Gate</strong>
              <span className="text-[10px] font-bold text-[#1a7f5a]">PASS · FAIL · NOT_EVALUATED</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-[#e5e9ee]">
            <div className="border border-[#e5e9ee] rounded-xl p-3 bg-white">
              <b className="block text-xs text-[#17202a]">PostgreSQL / RDS</b>
              <small className="text-[10px] text-[#697586]">테스트 정의 · Snapshot · 실행 이력</small>
            </div>
            <div className="border border-[#e5e9ee] rounded-xl p-3 bg-white">
              <b className="block text-xs text-[#17202a]">CloudWatch</b>
              <small className="text-[10px] text-[#697586]">로그 · 오류 · 지연 메트릭</small>
            </div>
            <div className="border border-[#e5e9ee] rounded-xl p-3 bg-white">
              <b className="block text-xs text-[#17202a]">Docker</b>
              <small className="text-[10px] text-[#697586]">일관된 실행 환경</small>
            </div>
            <div className="border border-[#e5e9ee] rounded-xl p-3 bg-white">
              <b className="block text-xs text-[#17202a]">GitHub Actions</b>
              <small className="text-[10px] text-[#697586]">자동 빌드 · 배포</small>
            </div>
          </div>
        </article>

        {/* Domain Rules */}
        <aside className="bg-white border border-[#e5e9ee] rounded-2xl p-6 sm:p-8 shadow-[0_3px_15px_rgba(17,31,44,0.025)] space-y-4">
          <h2 className="text-base font-bold text-[#17202a]">핵심 도메인 규칙</h2>
          <p className="text-xs text-[#697586] mb-4">UI 상태 모델의 기준</p>

          <div className="divide-y divide-[#e5e9ee]">
            {mockRules.map((rule) => (
              <div key={rule.number} className="py-3.5 flex gap-3">
                <span className="w-6 h-6 rounded-md bg-[#edf4f1] text-[#1a7f5a] text-[10px] font-black grid place-items-center flex-shrink-0">
                  {rule.number}
                </span>
                <div>
                  <b className="block text-xs text-[#17202a] mb-0.5">{rule.title}</b>
                  <span className="text-[11px] text-[#697586] leading-relaxed block">{rule.description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-[#edf6fc] text-[#245a80] text-[11px] leading-relaxed mt-4">
            <b>ERD 구조</b>: TestSuite → TestCase · TestRun → Snapshot → Baseline/Candidate Execution → Assertion/Change → QualityGate
          </div>
        </aside>
      </div>
    </section>
  );
};
