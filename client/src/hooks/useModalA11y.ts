import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseModalA11yOptions {
  open: boolean;
  onClose: () => void;
  dialogRef: React.RefObject<HTMLElement | null>;
}

function isFocusableElement(el: Element): boolean {
  const node = el as HTMLElement;
  if (typeof node.checkVisibility === 'function') {
    try {
      return node.checkVisibility({ checkVisibilityCSS: true });
    } catch {
      // fall through to attribute-based check
    }
  }
  return (
    !el.hasAttribute('hidden') &&
    el.getAttribute('aria-hidden') !== 'true' &&
    node.style.display !== 'none'
  );
}

/**
 * Adds keyboard accessibility for modal dialogs:
 * - Esc closes the dialog (calling `onClose`)
 * - Tab / Shift+Tab is trapped inside the dialog
 * - Focus moves into the dialog on open and back to the trigger on close
 */
export function useModalA11y({ open, onClose, dialogRef }: UseModalA11yOptions): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const getFocusables = (): HTMLElement[] => {
      const dialog = dialogRef.current;
      if (!dialog) return [];
      return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusableElement);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      const active = document.activeElement;
      const focusables = getFocusables();
      if (!dialog) return;

      const activeIsOutside = !dialog.contains(active);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && (active === first || activeIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || activeIsOutside)) {
        event.preventDefault();
        first.focus();
      }
    };

    const moveFocusIn = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = getFocusables();
      const target =
        focusables.find((el) => /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) ?? focusables[0] ?? dialog;
      target.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    const frame = requestAnimationFrame(() => moveFocusIn());

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus?.();
    };
  }, [open, dialogRef]);
}