import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { presentApiError } from '../../services/apiClient';

interface RequestErrorBannerProps {
  error: unknown;
  fallbackMessage: string;
  helpMessage?: string;
  messageOverride?: string;
  onRetry?: () => void;
  stale?: boolean;
}

export const RequestErrorBanner: React.FC<RequestErrorBannerProps> = ({
  error,
  fallbackMessage,
  helpMessage,
  messageOverride,
  onRetry,
  stale = false,
}) => {
  const presented = presentApiError(error, fallbackMessage);
  const message = messageOverride ?? presented.message;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#f4c7c3] bg-[#fff0ef] px-4 py-3 text-xs text-[#8f2925] sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">{stale ? '최신 데이터를 불러오지 못해 이전 데이터를 표시합니다.' : message}</p>
          {stale && <p className="mt-1 text-[#a14843]">{message}</p>}
          <p className="mt-1 font-mono text-[10px] text-[#a85a55]">오류 코드: {presented.code}</p>
          {helpMessage && <p className="mt-2 leading-relaxed text-[#8f2925]">{helpMessage}</p>}
          {presented.fieldErrors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {presented.fieldErrors.map((fieldError) => (
                <li key={`${fieldError.field}-${fieldError.message}`}>
                  {fieldError.field}: {fieldError.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#e6aaa5] bg-white px-3 py-2 font-bold text-[#8f2925] hover:bg-[#fff8f7]"
        >
          <RefreshCw size={13} /> 다시 시도
        </button>
      )}
    </div>
  );
};
