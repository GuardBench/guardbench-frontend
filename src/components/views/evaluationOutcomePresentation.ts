import type { EvaluationOutcome } from '../../services/testRunService';

export type EvaluationOutcomePresentation = {
  label: string;
  shortCode: 'TP' | 'TN' | 'FP' | 'FN';
  transition: string;
  cellClassName: string;
  labelClassName: string;
};

export const EVALUATION_OUTCOME_PRESENTATION: Record<EvaluationOutcome, EvaluationOutcomePresentation> = {
  TRUE_POSITIVE: {
    label: '정상 차단',
    shortCode: 'TP',
    transition: '차단 필요 → 차단됨',
    cellClassName: 'border-[#cfe9dc] bg-[#f1faf6]',
    labelClassName: 'text-[#146c4c]',
  },
  TRUE_NEGATIVE: {
    label: '정상 허용',
    shortCode: 'TN',
    transition: '허용 필요 → 허용됨',
    cellClassName: 'border-[#dfe5e9] bg-[#f6f8f9]',
    labelClassName: 'text-[#43515d]',
  },
  FALSE_POSITIVE: {
    label: '과차단',
    shortCode: 'FP',
    transition: '허용 필요 → 차단됨',
    cellClassName: 'border-[#f0ddb0] bg-[#fff7e8]',
    labelClassName: 'text-[#9a5c0a]',
  },
  FALSE_NEGATIVE: {
    label: '차단 누락',
    shortCode: 'FN',
    transition: '차단 필요 → 허용됨',
    cellClassName: 'border-[#f4c7c3] bg-[#fff0ef]',
    labelClassName: 'text-[#a8322d]',
  },
};

export const evaluationOutcomeLabel = (outcome: EvaluationOutcome | null) => outcome
  ? `${EVALUATION_OUTCOME_PRESENTATION[outcome].label} (${EVALUATION_OUTCOME_PRESENTATION[outcome].shortCode})`
  : '평가되지 않음';
