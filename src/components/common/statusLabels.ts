import type { ProgressState } from '../../types';

const PROGRESS_STATUS_LABELS: Record<ProgressState, string> = {
  QUEUED: '대기 중',
  PREPARING: '대상 준비 중',
  RUNNING: '실행 중',
  FINISHED: '종료',
};

export const progressStatusLabel = (status: ProgressState | string) => (
  PROGRESS_STATUS_LABELS[status as ProgressState] ?? status
);
