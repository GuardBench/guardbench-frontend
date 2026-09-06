import type { Action } from '../../services/testRunService';
import { actionCodePresentation, optionalActionPresentation } from './actionPresentation';

export const ActionCode = ({ value }: { value: Action }) => {
  const presentation = actionCodePresentation(value);
  return <span className={presentation.fontClassName}>{presentation.label}</span>;
};

export const OptionalActionValue = ({ value }: { value: Action | null }) => {
  const presentation = optionalActionPresentation(value);
  return <span className={presentation.fontClassName || undefined}>{presentation.label}</span>;
};
