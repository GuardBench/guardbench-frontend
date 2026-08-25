import React from 'react';
import type { SnapshotCase } from '../../types';
import { StatusPill } from './StatusPill';
import { X, Clock, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface SnapshotDiffModalProps {
  snapshot: SnapshotCase | null;
  onClose: () => void;
}

export const SnapshotDiffModal: React.FC<SnapshotDiffModalProps> = ({ snapshot, onClose }) => {
  if (!snapshot) return null;

  const {
    id,
    title,
    category,
    severity,
    expected,
    assertion,
    change,
    inputPrompt,
    baselineExecution,
    candidateExecution,
  } = snapshot;

  const getSeverityStyle = (s: string) => {
    if (s === 'CRITICAL') return 'bg-[#ffe6e4] text-[#a92e29]';
    if (s === 'HIGH') return 'bg-[#fff0d4] text-[#a56512]';
    return 'bg-[#eee9f8] text-[#675099]';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-rise">
      {/* Background overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative z-10 w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-[#e5e9ee]">
        {/* Header */}
        <div className="p-6 border-b border-[#e5e9ee] flex items-start justify-between bg-[#fafbfb]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${getSeverityStyle(severity)}`}>
                {severity}
              </span>
              <span className="text-xs text-[#697586] font-mono">{id}</span>
              <span className="text-xs text-[#697586]">· {category}</span>
            </div>
            <h2 className="text-lg font-bold text-[#17202a]">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#697586] hover:bg-gray-200 transition-colors"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Assertion & Change Summary */}
          <div className="p-4 rounded-xl border border-[#e5e9ee] bg-[#f8f9fa] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] text-[#697586] font-bold block">기대 판정 (Expected)</span>
                <b className={`text-sm font-mono ${expected === 'BLOCK' ? 'text-[#1a7f5a]' : 'text-[#246fa8]'}`}>
                  {expected}
                </b>
              </div>
              <div className="h-8 w-[1px] bg-[#e5e9ee]" />
              <div>
                <span className="text-[10px] text-[#697586] font-bold block">Assertion 결과</span>
                <StatusPill status={assertion} />
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[#697586] font-bold block mb-1">Change 판정</span>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                  change === 'SECURITY REGRESSION'
                    ? 'bg-[#fff0ef] text-[#bd3b35]'
                    : change === 'IMPROVEMENT'
                    ? 'bg-[#e9f7f1] text-[#1a7f5a]'
                    : 'bg-[#f1f3f5] text-[#586473]'
                }`}
              >
                {change}
              </span>
            </div>
          </div>

          {/* Input Prompt Section */}
          <div>
            <h3 className="text-xs font-extrabold text-[#4e5a68] uppercase tracking-wider mb-2">
              입력 프롬프트 (Input Prompt)
            </h3>
            <div className="p-4 rounded-xl border border-[#e5e9ee] bg-[#fbfcfc] text-xs font-mono text-[#17202a] leading-relaxed break-words">
              {inputPrompt || '기본 프롬프트 내용이 설정되어 있지 않습니다.'}
            </div>
          </div>

          {/* Side-by-Side Execution Comparison */}
          <div>
            <h3 className="text-xs font-extrabold text-[#4e5a68] uppercase tracking-wider mb-3">
              실행 비교 (Baseline vs Candidate)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline Execution Card */}
              <div className="border border-[#e5e9ee] rounded-xl p-4 bg-white flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-extrabold text-[#697586] tracking-wider">BASELINE (v7)</span>
                    <span className="text-[10px] text-[#697586] flex items-center gap-1">
                      <Clock size={12} /> {baselineExecution?.latencyMs || 0}ms
                    </span>
                  </div>

                  <div className="flex items-center gap-2 my-2">
                    {baselineExecution?.action === 'BLOCK' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1a7f5a] bg-[#e9f7f1] px-2 py-0.5 rounded">
                        <ShieldAlert size={14} /> BLOCK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#246fa8] bg-[#edf6fc] px-2 py-0.5 rounded">
                        <ShieldCheck size={14} /> ALLOW
                      </span>
                    )}
                  </div>

                  {baselineExecution?.filterReason && (
                    <div className="text-[10px] text-[#a56512] bg-[#fff7e8] px-2 py-1 rounded font-mono mb-2">
                      Reason: {baselineExecution.filterReason}
                    </div>
                  )}

                  <div className="text-xs text-[#17202a] bg-[#f8f9fa] p-3 rounded-lg border border-[#e5e9ee] font-mono leading-relaxed mt-2 min-h-[90px]">
                    {baselineExecution?.rawResponse || '응답 데이터 없음'}
                  </div>
                </div>
              </div>

              {/* Candidate Execution Card */}
              <div
                className={`border rounded-xl p-4 bg-white flex flex-col justify-between space-y-3 ${
                  change === 'SECURITY REGRESSION' ? 'border-[#bd3b35] bg-[#fff0ef]/20' : 'border-[#e5e9ee]'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-extrabold text-[#697586] tracking-wider">
                      CANDIDATE (Draft → v8)
                    </span>
                    <span className="text-[10px] text-[#697586] flex items-center gap-1">
                      <Clock size={12} /> {candidateExecution?.latencyMs || 0}ms
                    </span>
                  </div>

                  <div className="flex items-center gap-2 my-2">
                    {candidateExecution?.action === 'BLOCK' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1a7f5a] bg-[#e9f7f1] px-2 py-0.5 rounded">
                        <ShieldAlert size={14} /> BLOCK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#bd3b35] bg-[#fff0ef] px-2 py-0.5 rounded">
                        <AlertTriangle size={14} /> ALLOW (회귀)
                      </span>
                    )}
                  </div>

                  {candidateExecution?.filterReason && (
                    <div className="text-[10px] text-[#a56512] bg-[#fff7e8] px-2 py-1 rounded font-mono mb-2">
                      Reason: {candidateExecution.filterReason}
                    </div>
                  )}

                  <div className="text-xs text-[#17202a] bg-[#f8f9fa] p-3 rounded-lg border border-[#e5e9ee] font-mono leading-relaxed mt-2 min-h-[90px]">
                    {candidateExecution?.rawResponse || '응답 데이터 없음'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e5e9ee] bg-[#fafbfb] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#17202a] text-white text-xs font-bold hover:bg-[#253545]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
