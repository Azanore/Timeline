import { useEffect, useRef, useCallback } from 'react';

export default function Modal({ open, onClose, ariaLabel, children }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  // Focus management: trap focus within the panel
  const focusFirst = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const target = first || panel;
    target.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement;
    // Defer to allow DOM paint
    const id = setTimeout(focusFirst, 0);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      } else if (e.key === 'Tab') {
        // Trap focus
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(
          panel.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(id);
      document.removeEventListener('keydown', onKey, true);
      // Restore focus to previous active element
      if (prevActive && prevActive.focus) prevActive.focus({ preventScroll: true });
    };
  }, [open, onClose, focusFirst]);

  if (!open) return null;
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || 'Dialog'}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={panelRef}
        className="relative bg-white rounded shadow-xl w-full max-w-lg mx-4 p-4 outline-none"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
