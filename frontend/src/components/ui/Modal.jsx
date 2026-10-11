import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

// Shared accessible overlay: Esc to close, focus moves in, scroll locked.
function Overlay({ open, onClose, title, subtitle, footer, children, panelClass, wrapClass, headerExtra }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={`no-print fixed inset-0 z-50 flex ${wrapClass}`}>
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`relative flex max-h-full flex-col bg-white shadow-lift ${panelClass}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-navy-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-navy-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button onClick={onClose} className="rounded-lg p-1.5 text-navy-500 hover:bg-navy-100" aria-label="Close">
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-navy-100 bg-white px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Modal({ size = 'md', ...props }) {
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[size];
  return (
    <Overlay
      {...props}
      wrapClass="items-center justify-center p-4"
      panelClass={`w-full ${width} rounded-2xl`}
    />
  );
}

export function Drawer(props) {
  return (
    <Overlay
      {...props}
      wrapClass="items-stretch justify-end"
      panelClass="h-full w-full max-w-md sm:rounded-l-2xl"
    />
  );
}

export default Modal;
