'use client';

// FMCore ERP — Tab Navigator Dropdown (Excel-like sheet tab picker)
// A small dropdown button at the right edge of the tab bar that lists all open tabs
// for quick navigation, similar to Excel's worksheet navigation arrows.
import { useEffect, useRef, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { ChevronDown, X, List } from 'lucide-react';

export function TabNavigator() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useErpStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (tabs.length <= 1) return null;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 h-full px-2.5 border-l border-[var(--erp-border)] transition-colors',
          open
            ? 'bg-[var(--erp-accent-dim)] text-[var(--erp-accent)]'
            : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)]',
        )}
        title="All tabs"
        aria-label="Show all tabs"
      >
        <List className="w-3.5 h-3.5" />
        <span className="text-[10px] font-medium hidden sm:inline">{tabs.length}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-0 w-64 max-h-[400px] overflow-y-auto bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-md shadow-xl z-50"
          style={{ animation: 'dropdownIn 0.15s ease-out' }}
        >
          <style>{`@keyframes dropdownIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div className="px-3 py-2 border-b border-[var(--erp-border)] bg-[var(--erp-bg-secondary)] flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--erp-text-muted)]">Open Tabs ({tabs.length})</span>
            <button
              onClick={() => {
                // Close all tabs except Dashboard
                tabs.filter((t) => t.id !== 'dashboard').forEach((t) => closeTab(t.id));
                setOpen(false);
              }}
              className="text-[10px] text-[var(--erp-danger)] hover:underline"
            >
              Close All
            </button>
          </div>
          <div className="py-1">
            {tabs.map((tab, idx) => (
              <div
                key={tab.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                  activeTabId === tab.id
                    ? 'bg-[var(--erp-accent-dim)]'
                    : 'hover:bg-[var(--erp-bg-hover)]',
                )}
                onClick={() => { setActiveTab(tab.id); setOpen(false); }}
              >
                <span className="text-[9px] text-[var(--erp-text-muted)] font-mono w-4 text-right">{idx + 1}</span>
                <FAIcon name={tab.icon} className={cn('text-[11px] shrink-0', activeTabId === tab.id ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text-muted)]')} />
                <span className={cn(
                  'flex-1 text-[12px] truncate',
                  activeTabId === tab.id ? 'text-[var(--erp-accent)] font-medium' : 'text-[var(--erp-text-secondary)]',
                )}>
                  {tab.label}
                </span>
                {tab.id !== 'dashboard' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)] hover:bg-[var(--erp-bg-hover)] transition-all"
                    aria-label={`Close ${tab.label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
