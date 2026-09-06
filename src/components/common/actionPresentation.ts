import type { Action } from '../../services/testRunService';

export type ActionCodePresentation = {
  label: Action;
  fontClassName: 'font-mono';
};

export type OptionalActionPresentation = {
  label: Action | '없음';
  fontClassName: 'font-mono' | '';
};

export const actionCodePresentation = (action: Action): ActionCodePresentation => ({
  label: action,
  fontClassName: 'font-mono',
});

export const optionalActionPresentation = (action: Action | null): OptionalActionPresentation => action
  ? actionCodePresentation(action)
  : { label: '없음', fontClassName: '' };
