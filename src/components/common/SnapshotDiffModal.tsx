import React from 'react';
import type { SnapshotCase } from '../../types';
import { StatusPill } from './StatusPill';
import { X, Clock, ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle } from 'lucide-react';

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
    baseline,
    candidate,
  } = snapshot;

  const getSeverityStyle = (s: string) => {
    if (s === 'CRITICAL') return 'bg-[#ffe6e4] text-[#a92e29]';
    if (s === 'HIGH') return 'bg-[#fff0d4] text-[#a56512]';
    return 'bg-[#eee9f8] text-[#675099]';
  };

  const renderTargetBadge = (detail: typeof baseline) => {
    if (detail.status === 'BLOCK') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1a7f5a] bg-[#e9f7f1] px-2 py-0.5 rounded">
          <ShieldAlert size={14} /> BLOCK
        </span>
      );
    }
    if (detail.status === 'ALLOW') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#246fa8] bg-[#edf6fc] px-2 py-0.5 rounded">
          <ShieldCheck size={14} /> ALLOW
        </span>
      );
    }
    if (detail.status === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#bd3b35] bg-[#fff0ef] px-2 py-0.5 rounded">
          <AlertTriangle size={14} /> 실패 ({detail.errorCode || '실행 오류'})
        </span>
      );
    }
    if (detail.status === 'TIMEOUT') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#a56512] bg-[#fff7e8] px-2 py-0.5 rounded">
          <Clock size={14} /> 시간 초과 ({detail.errorCode || 'TIMEOUT'})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#566271] bg-[#eef1f4] px-2 py-0.5 rounded">
        <HelpCircle size={14} /> 미시작
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-rise">
      <div className="absolute inset-0" onClick={onClose} />

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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Box */}
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
                {assertion === 'NONE' ? (
                  <span className="text-xs font-semibold text-[#8fa0ad]">— 생성 안 됨</span>
                ) : (
                  <StatusPill status={assertion} />
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[#697586] font-bold block mb-1">Change 판정</span>
              {change === 'NONE' ? (
                <span className="text-xs font-semibold text-[#8fa0ad]">— 생성 안 됨</span>
              ) : change === 'NOT_COMPARABLE' ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#eef1f4] text-[#586473] border border-[#dce1e6]">
                  비교 불가
                </span>
              ) : (
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                    change === 'SECURITY_REGRESSION'
                      ? 'bg-[#fff0ef] text-[#bd3b35]'
                      : change === 'IMPROVEMENT'
                      ? 'bg-[#e9f7f1] text-[#1a7f5a]'
                      : 'bg-[#f1f3f5] text-[#586473]'
                  }`}
                >
                  {change}
                </span>
              )}
            </div>
          </div>

          {/* Input Prompt */}
          <div>
            <h3 className="text-xs font-extrabold text-[#4e5a68] uppercase tracking-wider mb-2">
              입력 프롬프트 (Input Prompt)
            </h3>
            <div className="p-4 rounded-xl border border-[#e5e9ee] bg-[#fbfcfc] text-xs font-mono text-[#17202a] leading-relaxed break-words">
              {inputPrompt || '기본 프롬프트 내용'}
            </div>
          </div>

          {/* Comparison Cards */}
          <div>
            <h3 className="text-xs font-extrabold text-[#4e5a68] uppercase tracking-wider mb-3">
              실행 비교 (Baseline vs Candidate)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline Card */}
              <div className="border border-[#e5e9ee] rounded-xl p-4 bg-white space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-[#697586] tracking-wider">BASELINE (v7)</span>
                  {baseline.latencyMs !== undefined && (
                    <span className="text-[10px] text-[#697586] flex items-center gap-1">
                      <Clock size={12} /> {baseline.latencyMs}ms
                    </span>
                  )}
                </div>

                <div className="my-2">{renderTargetBadge(baseline)}</div>

                {baseline.errorMessage && (
                  <div className="text-[11px] text-[#bd3b35] bg-[#fff0ef] p-2.5 rounded-lg border border-[#f5c6cb] font-semibold">
                    {baseline.errorMessage}
                  </div>
                )}

                {baseline.filterReason && (
                  <div className="text-[10px] text-[#a56512] bg-[#fff7e8] px-2 py-1 rounded font-mono">
                    Reason: {baseline.filterReason}
                  </div>
                )}

                <div className="text-xs text-[#17202a] bg-[#f8f9fa] p-3 rounded-lg border border-[#e5e9ee] font-mono leading-relaxed min-h-[80px]">
                  {baseline.rawResponse || '응답 없음'}
                </div>
              </div>

              {/* Candidate Card */}
              <div
                className={`border rounded-xl p-4 bg-white space-y-3 ${
                  change === 'SECURITY_REGRESSION' ? 'border-[#bd3b35] bg-[#fff0ef]/10' : 'border-[#e5e9ee]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-[#697586] tracking-wider">CANDIDATE (Draft → v8)</span>
                  {candidate.latencyMs !== undefined && (
                    <span className="text-[10px] text-[#697586] flex items-center gap-1">
                      <Clock size={12} /> {candidate.latencyMs}ms
                    </span>
                  )}
                </div>

                <div className="my-2">{renderTargetBadge(candidate)}</div>

                {candidate.errorMessage && (
                  <div className="text-[11px] text-[#bd3b35] bg-[#fff0ef] p-2.5 rounded-lg border border-[#f5c6cb] font-semibold">
                    {candidate.errorMessage}
                  </div>
                )}

                {candidate.filterReason && (
                  <div className="text-[10px] text-[#a56512] bg-[#fff7e8] px-2 py-1 rounded font-mono">
                    Reason: {candidate.filterReason}
                  </div>
                )}

                <div className="text-xs text-[#17202a] bg-[#f8f9fa] p-3 rounded-lg border border-[#e5e9ee] font-mono leading-relaxed min-h-[80px]">
                  {candidate.rawResponse || '응답 없음'}
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
