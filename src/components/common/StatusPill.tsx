import React from 'react';
import type { ProgressState, ExecutionResultState, QualityGateState } from '../../types';

type PillKind = 'progress' | 'execution' | 'gate' | 'generic';

interface StatusPillProps {
  kind?: PillKind;
  status: ProgressState | ExecutionResultState | QualityGateState | string | null;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ kind = 'generic', status, className = '' }) => {
  if (!status) return null;

  let label = String(status);
  let styleClasses = 'bg-[#eef1f4] text-[#566271]';

  // 1. 진행 상태 (Progress)
  if (kind === 'progress' || status === 'QUEUED' || status === 'PREPARING' || status === 'RUNNING' || status === 'FINISHED') {
    switch (status) {
      case 'QUEUED':
        label = '대기 중';
        styleClasses = 'bg-[#eef1f4] text-[#566271]';
        break;
      case 'PREPARING':
        label = '대상 준비 중';
        styleClasses = 'bg-[#fff7e8] text-[#a56512]';
        break;
      case 'RUNNING':
        label = '실행 중';
        styleClasses = 'bg-[#edf6fc] text-[#246fa8]';
        break;
      case 'FINISHED':
        label = '종료';
        styleClasses = 'bg-[#e9f7f1] text-[#1a7f5a]';
        break;
    }
  }

  // 2. 실행 결과 (Execution Result)
  if (kind === 'execution' || status === 'COMPLETED' || status === 'INCOMPLETE' || status === 'FAILED') {
    switch (status) {
      case 'COMPLETED':
        label = '정상 완료';
        styleClasses = 'bg-[#e9f7f1] text-[#1a7f5a]';
        break;
      case 'INCOMPLETE':
        label = '부분 완료';
        styleClasses = 'bg-[#fff7e8] text-[#a56512]';
        break;
      case 'FAILED':
        label = '실행 오류';
        styleClasses = 'bg-[#fff0ef] text-[#bd3b35]';
        break;
    }
  }

  // 3. Quality Gate
  if (kind === 'gate' || status === 'NOT_EVALUATED_BEFORE_FINISH' || status === 'PASS' || status === 'FAIL' || status === 'NOT_EVALUATED') {
    switch (status) {
      case 'NOT_EVALUATED_BEFORE_FINISH':
        label = '평가 전';
        styleClasses = 'bg-[#eef1f4] text-[#8fa0ad]';
        break;
      case 'PASS':
        label = 'Gate 통과';
        styleClasses = 'bg-[#e9f7f1] text-[#1a7f5a]';
        break;
      case 'FAIL':
        label = 'Gate 실패';
        styleClasses = 'bg-[#fff0ef] text-[#bd3b35]';
        break;
      case 'NOT_EVALUATED':
        label = '평가 불가';
        styleClasses = 'bg-[#f1f3f5] text-[#586473] font-bold border border-[#dce1e6]';
        break;
    }
  }

  // 커스텀 일반 문자열 처리 (활성, 검토 필요, 초안 등)
  if (label === status) {
    if (status === '활성') styleClasses = 'bg-[#e9f7f1] text-[#1a7f5a]';
    else if (status === '검토 필요') styleClasses = 'bg-[#fff7e8] text-[#a56512]';
    else if (status === '초안') styleClasses = 'bg-[#eef1f4] text-[#566271]';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap ${styleClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};
