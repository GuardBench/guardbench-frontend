import { Check, Loader2 } from 'lucide-react';
import type { TestRunStatus } from '../../services/testRunService';

interface RunProgressStepperProps {
  status: TestRunStatus;
  processedCount: number;
  totalCount: number;
  percent: number;
  updatedAt?: string;
  compact?: boolean;
}

const STEPS: Array<{ status: TestRunStatus; label: string }> = [
  { status: 'QUEUED', label: '대기' },
  { status: 'PREPARING', label: '준비' },
  { status: 'RUNNING', label: '실행 중' },
  { status: 'FINISHED', label: '완료' },
];

const updatedAtLabel = (updatedAt: string | undefined) => updatedAt
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(updatedAt))
  : '확인 중';

export function RunProgressStepper({
  status,
  processedCount,
  totalCount,
  percent,
  updatedAt,
  compact = false,
}: RunProgressStepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.status === status);
  const clampedPercent = Math.max(0, Math.min(100, percent));

  if (compact && status === 'FINISHED') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce9e3] bg-[#f0faf6] px-4 py-3 text-xs text-[#285c49]">
        <div className="flex items-center gap-2 font-bold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a7f5a] text-white"><Check size={14} /></span>
          테스트 실행 완료
        </div>
        <span>{processedCount} / {totalCount} TestCase · {clampedPercent.toFixed(0)}%</span>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-[#dce1e6] bg-white p-5 shadow-[0_3px_15px_rgba(17,31,44,0.025)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-[#1a7f5a]">Run progress</div>
          <h2 className="mt-1 text-base font-extrabold text-[#17202a]">테스트 진행 상황</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#eef8f4] px-3 py-1.5 text-[11px] font-bold text-[#1a7f5a]">
          {status === 'RUNNING' && <Loader2 size={12} className="animate-spin" />}
          {STEPS[currentIndex]?.label ?? status}
        </div>
      </div>

      <div className="flex items-start">
        {STEPS.map((step, index) => {
          const complete = index < currentIndex || status === 'FINISHED';
          const active = index === currentIndex && status !== 'FINISHED';
          return (
            <div key={step.status} className="flex min-w-0 flex-1 items-start last:flex-none">
              <div className="flex w-12 shrink-0 flex-col items-center text-center sm:w-16">
                <div className="relative">
                  {active && status === 'RUNNING' && (
                    <span className="absolute inset-0 rounded-full bg-[#60b893] opacity-30 motion-safe:animate-ping" />
                  )}
                  <div className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${complete || active ? 'bg-[#1a7f5a] text-white' : 'bg-[#eef1f4] text-[#8fa0ad]'}`}>
                    {complete ? <Check size={15} /> : index + 1}
                  </div>
                </div>
                <span className={`mt-2 text-[10px] font-bold sm:text-[11px] ${complete || active ? 'text-[#17202a]' : 'text-[#8fa0ad]'}`}>{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="mt-4 h-1 min-w-5 flex-1 rounded-full bg-[#eef1f4]">
                  <div className={`h-full rounded-full transition-all duration-500 ${index < currentIndex || status === 'FINISHED' ? 'w-full bg-[#1a7f5a]' : 'w-0'}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="font-bold text-[#17202a]">{processedCount} / {totalCount} TestCase 처리</span>
          <span className="font-black text-[#1a7f5a]">{clampedPercent.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#eef1f4]" role="progressbar" aria-label="TestRun 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clampedPercent}>
          <div className="h-full rounded-full bg-[#1a7f5a] transition-[width] duration-500" style={{ width: `${clampedPercent}%` }} />
        </div>
        <div className="mt-2 text-right text-[10px] text-[#8fa0ad]">마지막 갱신 {updatedAtLabel(updatedAt)}</div>
      </div>
    </section>
  );
}
