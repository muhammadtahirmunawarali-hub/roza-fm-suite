'use client';

// FMCore ERP — Record Detail Drawer (slide-in panel from right)
// Replaces the View modal with a richer UX: tabs for Details / History / Activity,
// inline workflow actions, and a timeline of status transitions.
import { useEffect, useState } from 'react';
import { recordsApi } from '@/lib/erp/api';
import { useErpStore } from '@/lib/erp/store';
import type { Register, RecordData, ColumnDef } from '@/lib/erp/types';
import { FAIcon } from './icon';
import { ApprovalWorkflow } from './approval-workflow';
import { printRecord } from './print-record';
import { cn } from '@/lib/utils';
import { formatCell, formatDate, formatTimeAgo, statusVariant } from '@/lib/erp/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  X, Printer, Pencil, Workflow as WorkflowIcon, History as HistoryIcon,
  FileText, Activity, Clock, CheckCircle2, ArrowRight, Loader2,
} from 'lucide-react';

interface HistoryEntry {
  id: string;
  action: string;
  summary: string;
  userName: string;
  userAvatar: string;
  userRole: string | null;
  statusChange: { from: string; to: string } | null;
  createdAt: string;
}

interface Props {
  open: boolean;
  register: Register;
  record: RecordData | null;
  company: { name: string; address: string; phone: string; email: string; tax_number: string };
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}

type Tab = 'details' | 'history' | 'activity';

export function RecordDetailDrawer({ open, register, record, company, onClose, onEdit, onRefresh }: Props) {
  const { hasPermission } = useErpStore();
  const [tab, setTab] = useState<Tab>('details');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // Initialize as true since data loads on mount (component is keyed by record id)
  const [historyLoading, setHistoryLoading] = useState(true);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const canEdit = hasPermission(register.code, 'edit');
  const canApprove = hasPermission(register.code, 'approve');
  const hasStatusCol = register.columns.some((c) => c.type === 'status');

  // Load history when drawer opens or record changes
  useEffect(() => {
    if (!open || !record) return;
    let cancelled = false;
    recordsApi.getHistory(register.id, record.id).then((res) => {
      if (cancelled) return;
      setHistory(res.history || []);
    }).catch((e) => {
      if (cancelled) return;
      console.error('Failed to load history', e);
    }).finally(() => {
      if (cancelled) return;
      setHistoryLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, record, register.id]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !workflowOpen) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, workflowOpen, onClose]);

  if (!record) return null;

  const statusCol = register.columns.find((c) => c.type === 'status');
  const currentStatus = statusCol ? String(record.data[statusCol.name] || '—') : null;

  const handlePrint = () => {
    printRecord(register, record, company);
  };

  const handleWorkflowClick = () => {
    setWorkflowOpen(true);
  };

  const handleWorkflowTransition = () => {
    setWorkflowOpen(false);
    onRefresh();
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => !workflowOpen && onClose()}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          'fixed right-0 top-0 bottom-0 w-full sm:w-[560px] bg-[var(--erp-bg-secondary)] border-l border-[var(--erp-border)] flex flex-col z-50 shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `}</style>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 h-[60px] border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)] shrink-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${register.color}30, ${register.color}10)`, color: register.color }}
          >
            <FAIcon name={register.icon} className="text-[14px]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-[var(--erp-text)] truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {register.name} — #{record.sequence}
            </div>
            <div className="text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1.5">
              <span>Record ID: {record.id.slice(-8)}</span>
              {currentStatus && (
                <>
                  <span>·</span>
                  <StatusPill status={currentStatus} />
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-[var(--erp-text-muted)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)] transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)] shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-[11px]">
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </Button>
          {hasStatusCol && (canApprove || canEdit) && (
            <Button variant="outline" size="sm" onClick={handleWorkflowClick} className="h-8 text-[11px] border-[var(--erp-accent-border)] text-[var(--erp-accent)] hover:bg-[var(--erp-accent-dim)]">
              <WorkflowIcon className="w-3.5 h-3.5 mr-1" /> Workflow
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={onEdit} className="h-8 text-[11px] ml-auto bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)] shrink-0">
          <TabButton active={tab === 'details'} onClick={() => setTab('details')} icon={<FileText className="w-3.5 h-3.5" />} label="Details" />
          <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={<HistoryIcon className="w-3.5 h-3.5" />} label="History" count={history.length} />
          <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={<Activity className="w-3.5 h-3.5" />} label="Activity" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[var(--erp-bg)]">
          {tab === 'details' && (
            <DetailsTab register={register} record={record} />
          )}
          {tab === 'history' && (
            <HistoryTab history={history} loading={historyLoading} hasStatusCol={!!hasStatusCol} />
          )}
          {tab === 'activity' && (
            <ActivityTab record={record} register={register} />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--erp-border)] bg-[var(--erp-bg-card)] shrink-0 flex items-center justify-between text-[10px] text-[var(--erp-text-muted)]">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Created {formatDate(record.createdAt)}
          </span>
          <span>Updated {formatTimeAgo(record.updatedAt)}</span>
        </div>
      </aside>

      {/* Workflow modal */}
      <ApprovalWorkflow
        open={workflowOpen}
        register={register}
        record={record}
        onClose={() => setWorkflowOpen(false)}
        onTransition={handleWorkflowTransition}
      />
    </>
  );
}

// ---------- Details Tab ----------
function DetailsTab({ register, record }: { register: Register; record: RecordData }) {
  const cols = register.columns.filter((c) => c.type !== 'auto_increment');

  // Group columns by type for better layout
  const mainFields = cols.filter((c) => ['text', 'date', 'datetime', 'time', 'number', 'currency', 'percentage', 'email', 'phone', 'dropdown', 'status', 'priority', 'rating', 'employee', 'department', 'building', 'asset', 'equipment', 'vendor'].includes(c.type));
  const longFields = cols.filter((c) => c.type === 'long_text');
  const multiFields = cols.filter((c) => c.type === 'multi_select');

  return (
    <div className="p-4 space-y-5">
      {/* Main fields grid */}
      <div>
        <SectionLabel icon="fa-circle-info" label="Record Fields" count={mainFields.length} />
        <div className="grid grid-cols-2 gap-2.5">
          {mainFields.map((col) => (
            <FieldCard key={col.name} col={col} value={record.data[col.name]} />
          ))}
        </div>
      </div>

      {/* Multi-select fields */}
      {multiFields.length > 0 && (
        <div>
          <SectionLabel icon="fa-list-check" label="Tags & Categories" count={multiFields.length} />
          <div className="space-y-2.5">
            {multiFields.map((col) => (
              <FieldCard key={col.name} col={col} value={record.data[col.name]} fullWidth />
            ))}
          </div>
        </div>
      )}

      {/* Long text fields */}
      {longFields.length > 0 && (
        <div>
          <SectionLabel icon="fa-align-left" label="Notes & Descriptions" count={longFields.length} />
          <div className="space-y-2.5">
            {longFields.map((col) => (
              <FieldCard key={col.name} col={col} value={record.data[col.name]} fullWidth />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldCard({ col, value, fullWidth }: { col: ColumnDef; value: any; fullWidth?: boolean }) {
  const isEmpty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

  return (
    <div className={cn('border border-[var(--erp-border)] rounded-md p-2.5 bg-[var(--erp-bg-card)]', fullWidth && 'col-span-2')}>
      <div className="text-[9px] uppercase tracking-wide text-[var(--erp-text-muted)] mb-1 flex items-center gap-1">
        <FAIcon name={colIconFor(col.type)} className="text-[8px]" />
        {col.name}
      </div>
      {isEmpty ? (
        <span className="text-[12px] text-[var(--erp-text-muted)] italic">—</span>
      ) : col.type === 'status' ? (
        <StatusPill status={String(value)} />
      ) : col.type === 'priority' ? (
        <PriorityPill priority={String(value)} />
      ) : col.type === 'rating' ? (
        <span className="text-[var(--erp-warning)] text-[13px]">
          {'★'.repeat(Number(value) || 0)}<span className="text-[var(--erp-text-muted)]">{'☆'.repeat(5 - (Number(value) || 0))}</span>
        </span>
      ) : col.type === 'currency' ? (
        <span className="text-[13px] font-mono font-semibold text-[var(--erp-text)]">{formatCurrencyCompact(Number(value) || 0)}</span>
      ) : col.type === 'percentage' ? (
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-mono text-[var(--erp-text)]">{value}%</span>
          <span className="flex-1 h-1.5 rounded-full bg-[var(--erp-bg-hover)] overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Number(value) || 0)}%`, background: 'var(--erp-accent)' }} />
          </span>
        </div>
      ) : col.type === 'multi_select' ? (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : [value]).map((v, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] font-medium">
              {String(v)}
            </span>
          ))}
        </div>
      ) : col.type === 'long_text' ? (
        <div className="text-[12px] text-[var(--erp-text)] whitespace-pre-wrap leading-relaxed">{String(value)}</div>
      ) : col.type === 'email' ? (
        <a href={`mailto:${value}`} className="text-[12px] text-[var(--erp-accent)] hover:underline">{String(value)}</a>
      ) : col.type === 'phone' ? (
        <a href={`tel:${value}`} className="text-[12px] text-[var(--erp-accent)] hover:underline">{String(value)}</a>
      ) : (
        <span className="text-[12px] text-[var(--erp-text)] font-medium">{String(value)}</span>
      )}
    </div>
  );
}

// ---------- History Tab ----------
function HistoryTab({ history, loading, hasStatusCol }: { history: HistoryEntry[]; loading: boolean; hasStatusCol: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[var(--erp-accent)] animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--erp-bg-hover)] flex items-center justify-center mb-3">
          <HistoryIcon className="w-7 h-7 text-[var(--erp-text-muted)]" />
        </div>
        <h3 className="text-[13px] font-semibold text-[var(--erp-text)] mb-1">No history yet</h3>
        <p className="text-[11px] text-[var(--erp-text-muted)] max-w-[260px]">
          Status transitions and edits for this record will appear here as a timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <SectionLabel icon="fa-clock-rotate-left" label="Status Transitions & Edits" count={history.length} />
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[var(--erp-border)]" />

        <div className="space-y-3">
          {history.map((entry, idx) => (
            <div key={entry.id} className="relative flex gap-3 pl-0">
              {/* Timeline dot */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-[var(--erp-bg)]',
                  idx === 0 ? 'bg-[var(--erp-accent)]' : 'bg-[var(--erp-bg-elevated)]',
                )}
              >
                <span className="text-[10px] font-bold text-white" style={{ color: idx === 0 ? 'white' : 'var(--erp-text-secondary)' }}>
                  {entry.action[0]}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[var(--erp-text)]">
                      {entry.statusChange ? (
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <StatusPill status={entry.statusChange.from} small />
                          <ArrowRight className="w-3 h-3 text-[var(--erp-text-muted)]" />
                          <StatusPill status={entry.statusChange.to} small />
                        </span>
                      ) : (
                        entry.summary
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--erp-text-muted)] mt-0.5 flex items-center gap-1.5">
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-[var(--erp-bg-hover)] flex items-center justify-center text-[8px] font-semibold text-[var(--erp-text-secondary)]">
                          {entry.userAvatar}
                        </span>
                        {entry.userName}
                      </span>
                      <span>·</span>
                      <span>{formatTimeAgo(entry.createdAt)}</span>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] font-semibold whitespace-nowrap">
                      LATEST
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Activity Tab ----------
function ActivityTab({ record, register }: { record: RecordData; register: Register }) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <SectionLabel icon="fa-circle-info" label="Record Metadata" />
        <div className="space-y-2">
          <MetaRow label="Record ID" value={record.id} mono />
          <MetaRow label="Register" value={register.name} />
          <MetaRow label="Register Code" value={register.code} mono />
          <MetaRow label="Sequence" value={`#${record.sequence}`} mono />
          <MetaRow label="Created At" value={formatDate(record.createdAt)} />
          <MetaRow label="Updated At" value={formatDate(record.updatedAt)} />
          <MetaRow label="Created By" value={record.createdBy || 'system'} />
          <MetaRow label="Updated By" value={record.updatedBy || 'system'} />
          <MetaRow label="Deleted" value={record.isDeleted ? 'Yes' : 'No'} />
        </div>
      </div>

      <div>
        <SectionLabel icon="fa-database" label="Raw Data (JSON)" />
        <pre className="text-[10px] bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-md p-3 overflow-x-auto font-mono text-[var(--erp-text-secondary)] max-h-[300px]">
          {JSON.stringify(record.data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ---------- Helpers ----------
function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
        active
          ? 'bg-[var(--erp-accent-dim)] text-[var(--erp-accent)]'
          : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)]',
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn(
          'px-1.5 rounded-full text-[9px] font-bold',
          active ? 'bg-[var(--erp-accent)] text-white' : 'bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)]',
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ icon, label, count }: { icon: string; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--erp-text-muted)]">
      <FAIcon name={icon} className="text-[10px]" />
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-[var(--erp-text-muted)] font-normal">({count})</span>
      )}
      <div className="flex-1 h-px bg-[var(--erp-border)]" />
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-[var(--erp-border)] last:border-b-0">
      <span className="text-[11px] text-[var(--erp-text-muted)]">{label}</span>
      <span className={cn('text-[11px] text-[var(--erp-text)] font-medium', mono && 'font-mono text-[10px]')}>{value}</span>
    </div>
  );
}

function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const variant = statusVariant(status);
  const colors: Record<string, string> = {
    success: 'var(--erp-success)',
    warning: 'var(--erp-warning)',
    danger: 'var(--erp-danger)',
    info: 'var(--erp-info)',
    accent: 'var(--erp-accent)',
    neutral: 'var(--erp-text-muted)',
    default: 'var(--erp-text-muted)',
  };
  const color = colors[variant] || colors.default;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium whitespace-nowrap',
        small ? 'text-[9px]' : 'text-[11px]',
      )}
      style={{ background: color + '20', color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  let color = 'var(--erp-info)';
  if (p === 'critical') color = 'var(--erp-danger)';
  else if (p === 'high') color = 'var(--erp-warning)';
  else if (p === 'medium') color = 'var(--erp-info)';
  else if (p === 'low') color = 'var(--erp-success)';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: color + '20', color }}>
      {priority}
    </span>
  );
}

function colIconFor(type: string): string {
  switch (type) {
    case 'text': return 'fa-font';
    case 'long_text': return 'fa-align-left';
    case 'number': return 'fa-hashtag';
    case 'currency': return 'fa-coins';
    case 'percentage': return 'fa-percent';
    case 'date': return 'fa-calendar';
    case 'datetime': return 'fa-calendar-days';
    case 'time': return 'fa-clock';
    case 'dropdown': return 'fa-list';
    case 'status': return 'fa-flag';
    case 'priority': return 'fa-bolt';
    case 'multi_select': return 'fa-list-check';
    case 'email': return 'fa-envelope';
    case 'phone': return 'fa-phone';
    case 'rating': return 'fa-star';
    case 'employee': return 'fa-user';
    case 'department': return 'fa-building-user';
    case 'building': return 'fa-city';
    case 'asset': return 'fa-cube';
    case 'equipment': return 'fa-gears';
    case 'vendor': return 'fa-truck';
    default: return 'fa-circle';
  }
}

function formatCurrencyCompact(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(1)}K`;
  return `AED ${n.toLocaleString()}`;
}
