import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const openDialogs: HTMLElement[] = [];
let bodyOverflowBeforeDialogs = '';

interface UseDialogFocusOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const focusableElements = (dialog: HTMLElement) => (
  Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true')
);

export function useDialogFocus({ isOpen, onClose, initialFocusRef }: UseDialogFocusOptions) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const returnFocusTarget = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    if (openDialogs.length === 0) bodyOverflowBeforeDialogs = document.body.style.overflow;
    openDialogs.push(dialog);
    document.body.style.overflow = 'hidden';

    const focusFrame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? focusableElements(dialog)[0] ?? dialog;
      target.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== dialog) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const elements = focusableElements(dialog);
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      const dialogIndex = openDialogs.lastIndexOf(dialog);
      if (dialogIndex >= 0) openDialogs.splice(dialogIndex, 1);
      if (openDialogs.length === 0) document.body.style.overflow = bodyOverflowBeforeDialogs;
      // 닫기 trigger가 DOM에 남아 있을 때만 focus를 복귀한다.
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus();
    };
  }, [initialFocusRef, isOpen]);

  return dialogRef;
}
