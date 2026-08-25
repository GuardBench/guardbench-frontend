import React from 'react';

interface StatusPillProps {
  status: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  let styleClasses = 'bg-[#eef1f4] text-[#566271]';

  switch (status.toUpperCase()) {
    case 'PASS':
    case 'COMPLETED':
    case '활성':
      styleClasses = 'bg-[#e9f7f1] text-[#1a7f5a]';
      break;
    case 'FAIL':
    case 'FAILED':
      styleClasses = 'bg-[#fff0ef] text-[#bd3b35]';
      break;
    case 'RUNNING':
    case 'RUN':
      styleClasses = 'bg-[#edf6fc] text-[#246fa8]';
      break;
    case 'WARN':
    case 'INCOMPLETE':
    case '검토 필요':
      styleClasses = 'bg-[#fff7e8] text-[#a56512]';
      break;
    case 'NOT_EVALUATED':
    case '초안':
    default:
      styleClasses = 'bg-[#eef1f4] text-[#566271]';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap ${styleClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};
