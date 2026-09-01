import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

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
const COMPOSITION_ESCAPE_GRACE_MS = 100;

interface UseDialogFocusOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const isVisible = (element: HTMLElement) => (
  element.getClientRects().length > 0
  && window.getComputedStyle(element).visibility === 'visible'
  && element.closest('[hidden], [aria-hidden="true"]') === null
);

const focusableElements = (dialog: HTMLElement) => (
  Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(isVisible)
);

const preservesNativeEscape = (target: EventTarget | null) => (
  target instanceof Element
  && target.closest('select') !== null
);

export function useDialogFocus({ isOpen, onClose, initialFocusRef }: UseDialogFocusOptions) {
  const [dialog, setDialog] = useState<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dialogRef = useCallback((node: HTMLElement | null) => setDialog(node), []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

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

    let compositionActive = false;
    let compositionResetTimer: ReturnType<typeof setTimeout> | undefined;
    const handleCompositionStart = () => {
      if (compositionResetTimer) clearTimeout(compositionResetTimer);
      compositionActive = true;
    };
    const handleCompositionEnd = () => {
      compositionResetTimer = setTimeout(() => {
        compositionActive = false;
      }, COMPOSITION_ESCAPE_GRACE_MS);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== dialog) return;

      if (event.key === 'Escape') {
        if (compositionActive || event.isComposing || event.keyCode === 229) return;
        if (preservesNativeEscape(event.target)) return;
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

    dialog.addEventListener('compositionstart', handleCompositionStart);
    dialog.addEventListener('compositionend', handleCompositionEnd);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      if (compositionResetTimer) clearTimeout(compositionResetTimer);
      dialog.removeEventListener('compositionstart', handleCompositionStart);
      dialog.removeEventListener('compositionend', handleCompositionEnd);
      document.removeEventListener('keydown', handleKeyDown);
      const dialogIndex = openDialogs.lastIndexOf(dialog);
      if (dialogIndex >= 0) openDialogs.splice(dialogIndex, 1);
      if (openDialogs.length === 0) document.body.style.overflow = bodyOverflowBeforeDialogs;
      // 닫기 trigger가 DOM에 남아 있을 때만 focus를 복귀한다.
      if (returnFocusTarget?.isConnected) returnFocusTarget.focus();
    };
  }, [dialog, initialFocusRef, isOpen]);

  return dialogRef;
}
