import { useEffect, useRef } from 'react';

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  onClearAll: () => void;
  children: React.ReactNode;
}

export default function FilterDrawer({
  open,
  onClose,
  resultCount,
  onClearAll,
  children,
}: FilterDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap: focus panel when opened
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="filter-drawer">
      <div className="filter-drawer__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="filter-drawer__panel"
        ref={panelRef}
        role="dialog"
        aria-label="Filters"
        tabIndex={-1}
      >
        <div className="filter-drawer__header">
          <h2 className="filter-drawer__title">Filters</h2>
          <button
            type="button"
            className="filter-drawer__close"
            onClick={onClose}
            aria-label="Close filters"
          >
            &times;
          </button>
        </div>
        <div className="filter-drawer__body">{children}</div>
        <div className="filter-drawer__footer">
          <button type="button" className="filter-drawer__clear-all" onClick={onClearAll}>
            Clear all
          </button>
          <button type="button" className="filter-drawer__apply" onClick={onClose}>
            Show {resultCount} event{resultCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
