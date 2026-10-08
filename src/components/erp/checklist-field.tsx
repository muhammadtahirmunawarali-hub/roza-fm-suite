'use client';

// Roza FM Suite — Checklist Field
// Interactive checklist with per-item status: Completed / N/A / Pending + notes.
//
// Used in any register that has a `checklist` column type. The column definition
// (on the register) stores the template items in `checklistItems`. The record's
// data stores the completed checklist as an array of { text, status, notes }.
//
// Features:
//   • Each item shows: text, status dropdown (Completed/NA/Pending), notes textarea
//   • Progress bar showing X/Y completed
//   • Color-coded statuses (green=completed, gray=NA, amber=pending)
//   • Auto-initializes from the template if the record has no checklist data yet
import { useMemo } from 'react';
import type { ChecklistItem, ChecklistItemStatus } from '@/lib/erp/types';
import { cn } from '@/lib/utils';
import { Check, X, Clock, ListChecks } from 'lucide-react';

export function ChecklistField({
  value,
  onChange,
  templateItems,
  label,
}: {
  value: any;
  onChange: (v: any) => void;
  templateItems?: { text: string; required?: boolean; category?: 'info'|'warning'|'critical' }[];
  label?: string;
}) {
  // Normalize the value into a ChecklistItem[] — initialize from template if empty
  const items: ChecklistItem[] = useMemo(() => {
    if (!value) {
      // Initialize from template
      return (templateItems || []).map((t) => ({
        text: t.text,
        status: 'Pending' as ChecklistItemStatus,
        notes: '',
        required: t.required,
        category: t.category,
      }));
    }
    // Parse existing value (could be array or JSON string)
    let parsed: any[] = [];
    if (Array.isArray(value)) parsed = value;
    else if (typeof value === 'string' && value.startsWith('[')) {
      try { parsed = JSON.parse(value); } catch { return []; }
    } else if (typeof value === 'string' && value) {
      return [{ text: value, status: 'Pending' as ChecklistItemStatus, notes: '' }];
    }
    // Merge with template (in case template items were added after the record was created)
    const templateTexts = (templateItems || []).map(t => t.text);
    const existingTexts = parsed.map(p => p.text);
    const merged = [
      ...parsed,
      ...(templateItems || []).filter(t => !existingTexts.includes(t.text)).map(t => ({
        text: t.text,
        status: 'Pending' as ChecklistItemStatus,
        notes: '',
        required: t.required,
        category: t.category,
      })),
    ];
    return merged;
  }, [value, templateItems]);

  const completed = items.filter((i) => i.status === 'Completed').length;
  const naCount = items.filter((i) => i.status === 'N/A').length;
  const pending = items.filter((i) => i.status === 'Pending').length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const updateItem = (idx: number, updates: Partial<ChecklistItem>) => {
    const newItems = items.map((item, i) => (i === idx ? { ...item, ...updates } : item));
    onChange(newItems);
  };

  if (items.length === 0) {
    return (
      <div className="p-3 rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] text-[11px] text-[var(--erp-text-muted)]">
        <ListChecks className="w-4 h-4 inline mr-1.5" />
        No checklist items defined. Add items in the Register Builder → Column Editor.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-3 p-2 rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)]">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-medium text-[var(--erp-text-secondary)]">
              {completed}/{total} completed · {naCount} N/A · {pending} pending
            </span>
            <span className="font-bold text-[var(--erp-accent)]">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--erp-bg-card)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: 'var(--erp-accent)' }}
            />
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={cn(
              'p-2.5 rounded-md border transition-colors',
              item.status === 'Completed' ? 'border-[var(--erp-success)]/30 bg-[var(--erp-success)]/5' :
              item.status === 'N/A' ? 'border-[var(--erp-border)] bg-[var(--erp-bg-card)] opacity-60' :
              item.category === 'critical' ? 'border-[var(--erp-danger)]/30 bg-[rgba(239,68,68,0.05)]' :
              item.category === 'warning' ? 'border-[var(--erp-warning)]/30 bg-[rgba(245,158,11,0.05)]' :
              'border-[var(--erp-border)] bg-[var(--erp-bg-card)]'
            )}
          >
            <div className="flex items-start gap-2">
              {/* Item number + text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-[var(--erp-text-muted)] shrink-0">{idx + 1}.</span>
                  <span className="text-[12px] text-[var(--erp-text)] font-medium">{item.text}</span>
                  {item.required && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-[var(--erp-danger)]/15 text-[var(--erp-danger)] font-bold">REQ</span>
                  )}
                  {item.category === 'critical' && <span className="text-[9px]">🔴</span>}
                  {item.category === 'warning' && <span className="text-[9px]">🟡</span>}
                </div>
              </div>

              {/* Status selector */}
              <div className="flex items-center gap-0.5 shrink-0">
                <StatusButton
                  active={item.status === 'Completed'}
                  onClick={() => updateItem(idx, { status: 'Completed' })}
                  color="success"
                  icon={<Check className="w-3 h-3" />}
                  label="Done"
                />
                <StatusButton
                  active={item.status === 'N/A'}
                  onClick={() => updateItem(idx, { status: 'N/A' })}
                  color="muted"
                  icon={<X className="w-3 h-3" />}
                  label="N/A"
                />
                <StatusButton
                  active={item.status === 'Pending'}
                  onClick={() => updateItem(idx, { status: 'Pending' })}
                  color="warning"
                  icon={<Clock className="w-3 h-3" />}
                  label="Pending"
                />
              </div>
            </div>

            {/* Notes (shown when completed or NA) */}
            {(item.status === 'Completed' || item.status === 'N/A') && (
              <input
                type="text"
                value={item.notes || ''}
                onChange={(e) => updateItem(idx, { notes: e.target.value })}
                placeholder={item.status === 'Completed' ? 'Completion notes...' : 'Reason for N/A...'}
                className="mt-1.5 w-full h-7 px-2 text-[11px] rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] text-[var(--erp-text)] placeholder:text-[var(--erp-text-muted)] focus:outline-none focus:border-[var(--erp-accent-border)]"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusButton({
  active,
  onClick,
  color,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  color: 'success' | 'muted' | 'warning';
  icon: React.ReactNode;
  label: string;
}) {
  const colorMap = {
    success: 'bg-[var(--erp-success)] text-white',
    muted: 'bg-[var(--erp-text-muted)] text-white',
    warning: 'bg-[var(--erp-warning)] text-white',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-0.5 px-1.5 py-1 rounded text-[9px] font-medium transition-all',
        active ? colorMap[color] : 'bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)] hover:bg-[var(--erp-bg-input)]'
      )}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Summary renderer for register-view table cells
export function ChecklistSummary({ value }: { value: any }) {
  let items: ChecklistItem[] = [];
  if (Array.isArray(value)) items = value;
  else if (typeof value === 'string' && value.startsWith('[')) {
    try { items = JSON.parse(value); } catch { return <span className="text-[var(--erp-text-muted)]">—</span>; }
  } else return <span className="text-[var(--erp-text-muted)]">—</span>;

  if (items.length === 0) return <span className="text-[var(--erp-text-muted)]">—</span>;

  const completed = items.filter(i => i.status === 'Completed').length;
  const na = items.filter(i => i.status === 'N/A').length;
  const pending = items.filter(i => i.status === 'Pending').length;
  const pct = Math.round((completed / items.length) * 100);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono text-[var(--erp-text)]">{completed}/{items.length}</span>
      <div className="flex items-center gap-0.5">
        {completed > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--erp-success)]/15 text-[var(--erp-success)] font-medium">{completed}✓</span>}
        {na > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--erp-text-muted)]/15 text-[var(--erp-text-muted)] font-medium">{na}NA</span>}
        {pending > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--erp-warning)]/15 text-[var(--erp-warning)] font-medium">{pending}⏳</span>}
      </div>
      <span className="text-[9px] text-[var(--erp-text-muted)]">({pct}%)</span>
    </div>
  );
}
