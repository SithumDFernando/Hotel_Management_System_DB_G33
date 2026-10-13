import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

// The "⋯" menu for secondary row actions (spec 11 §8: one visible action per row).
// items: [{ label, onClick?, to? }]. Enter/Space opens, ↑/↓/Home/End move,
// Esc or Tab closes (focus returns to the trigger). Rendered in a portal with
// fixed position so a table's scroll container can't clip it.
export default function RowMenu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const menu = useRef(null);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    const r = btn.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom > 48 * items.length + 16;
    setPos({
      right: Math.max(8, window.innerWidth - r.right),
      ...(below ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }),
    });
  }, [open, items.length]);

  useEffect(() => {
    if (!open || !pos) return undefined;
    menu.current?.querySelector('[role=menuitem]')?.focus();
    const onDown = (e) => {
      if (!menu.current?.contains(e.target) && !btn.current?.contains(e.target)) close(false);
    };
    const onScroll = (e) => {
      if (!menu.current?.contains(e.target)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos]);

  const onKeyDown = (e) => {
    const list = [...menu.current.querySelectorAll('[role=menuitem]')];
    const i = list.indexOf(document.activeElement);
    const next = {
      ArrowDown: (i + 1) % list.length,
      ArrowUp: (i - 1 + list.length) % list.length,
      Home: 0,
      End: list.length - 1,
    }[e.key];
    if (next !== undefined) {
      e.preventDefault();
      list[next].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  const itemCls = 'block w-full px-3 py-2 text-left text-sm text-ink-900 hover:bg-paper-200 focus:bg-paper-200 focus:outline-none';

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-600 hover:bg-paper-200 hover:text-ink-900"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && pos && createPortal(
        <div
          ref={menu}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          style={{ position: 'fixed', ...pos }}
          className="z-50 min-w-[10rem] rounded-md border border-ink-100 bg-paper-50 py-1 shadow-overlay"
        >
          {items.map((it) =>
            it.to ? (
              <Link key={it.label} to={it.to} role="menuitem" tabIndex={-1} className={itemCls} onClick={() => close(false)}>
                {it.label}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={itemCls}
                onClick={() => {
                  // Refocus the trigger first so a dialog opened by the item
                  // returns focus there when it closes.
                  close();
                  it.onClick();
                }}
              >
                {it.label}
              </button>
            ),
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
