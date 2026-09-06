'use client';

// FMCore ERP — Register View (grid + form mode)
import { useEffect, useMemo, useState, useCallback } from 'react';
import { recordsApi, registersApi } from '@/lib/erp/api';
import type { Register, RecordData, ColumnDef } from '@/lib/erp/types';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import {
  formatCell, formatDocNumber, statusVariant, priorityVariant,
  formatDate, formatTimeAgo, type BadgeVariant,
} from '@/lib/erp/utils';
import { RecordForm } from './record-form';
import {
  Plus, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Download, Upload, Printer, Trash2, Pencil, Eye, X, Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

interface Props {
  registerId: string;
}

const PAGE_SIZES = [10, 25, 50, 100];

export function RegisterView({ registerId }: Props) {
  const [register, setRegister] = useState<Register | null>(null);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecordData | null>(null);
  const [viewing, setViewing] = useState<RecordData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecordData | null>(null);

  // Load register meta
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const regs = await registersApi.list();
        const r = regs.find((x) => x.id === registerId);
        if (!cancelled && r) {
          setRegister(r);
          // Default sort: auto_increment column if exists
          const autoCol = r.columns.find((c) => c.type === 'auto_increment');
          if (autoCol) { setSortField(autoCol.name); setSortDir('asc'); }
        }
      } catch (e) { console.error(e); }
    })();
    return () => { cancelled = true; };
  }, [registerId]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load records
  const loadRecords = useCallback(async () => {
    if (!register) return;
    setLoading(true);
    try {
      const res = await recordsApi.list(registerId, {
        page, pageSize, search: debouncedSearch, sortField, sortDir, filters,
      });
      setRecords(res.data);
      setTotal(res.total);
    } catch (e: any) {
      toast.error('Failed to load records', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [register, registerId, page, pageSize, debouncedSearch, sortField, sortDir, filters]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    loadRecords();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await recordsApi.remove(registerId, deleteTarget.id);
      toast.success('Record deleted');
      setDeleteTarget(null);
      loadRecords();
    } catch (e: any) {
      toast.error('Delete failed', { description: e.message });
    }
  };

  const exportCsv = () => {
    if (!register || records.length === 0) return;
    const headers = register.columns.map((c) => c.name);
    const rows = records.map((r) =>
      register.columns.map((c) => {
        const v = r.data[c.name];
        if (Array.isArray(v)) return `"${v.join(', ')}"`;
        if (v === undefined || v === null) return '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }),
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${register.code}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${records.length} records to CSV`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!register) {
    return <div className="p-6 text-[var(--erp-text-muted)]">Loading register...</div>;
  }

  // Find filterable columns (status, priority, dropdown)
  const filterableCols = register.columns.filter((c) =>
    ['status', 'priority', 'dropdown'].includes(c.type) && c.options && c.options.length > 0
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)]">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: register.color + '20', color: register.color }}
            >
              <FAIcon name={register.icon} className="text-[16px]" />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-[var(--erp-text)]" style={{ fontFamily: 'var(--font-display)' }}>
                {register.name}
              </h1>
              {register.description && (
                <p className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">{register.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--erp-text-muted)]">
                <span className="px-1.5 py-0.5 rounded bg-[var(--erp-bg-hover)]">{register.category}</span>
                <span>·</span>
                <span>{register.columns.length} columns</span>
                <span>·</span>
                <span>{total} records</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} className="h-8 text-[12px]">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filters
              {Object.values(filters).filter(Boolean).length > 0 && (
                <span className="ml-1 px-1.5 rounded-full bg-[var(--erp-accent)] text-white text-[9px]">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} className="h-8 text-[12px]">
              <Download className="w-3.5 h-3.5 mr-1" /> Export
            </Button>
            <Button
              size="sm"
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="h-8 text-[12px] bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
            </Button>
          </div>
        </div>

        {/* Search + Filters row */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] focus:outline-none focus:border-[var(--erp-accent)] focus:ring-1 focus:ring-[var(--erp-accent-border)]"
            />
          </div>
          {showFilters && filterableCols.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterableCols.map((col) => (
                <select
                  key={col.name}
                  value={filters[col.name] || ''}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, [col.name]: e.target.value }));
                    setPage(1);
                  }}
                  className="text-[11px] py-1 px-2 rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] focus:outline-none focus:border-[var(--erp-accent)]"
                >
                  <option value="">{col.name}: All</option>
                  {col.options?.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ))}
              {Object.values(filters).filter(Boolean).length > 0 && (
                <button
                  onClick={() => { setFilters({}); setPage(1); }}
                  className="text-[11px] text-[var(--erp-danger)] hover:underline px-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <TableSkeleton cols={register.columns.length} />
        ) : records.length === 0 ? (
          <EmptyState onAdd={() => { setEditing(null); setFormOpen(true); }} registerName={register.name} />
        ) : (
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--erp-bg-elevated)] border-b border-[var(--erp-border)]">
                {register.columns.map((col) => (
                  <th
                    key={col.name}
                    onClick={() => toggleSort(col.name)}
                    className="px-3 py-2 text-left font-semibold text-[var(--erp-text-secondary)] text-[11px] uppercase tracking-wide cursor-pointer hover:bg-[var(--erp-bg-hover)] select-none whitespace-nowrap"
                    style={{ minWidth: col.width || 120 }}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.name}</span>
                      {sortField === col.name ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[var(--erp-accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--erp-accent)]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold text-[var(--erp-text-secondary)] text-[11px] uppercase tracking-wide sticky right-0 bg-[var(--erp-bg-elevated)] border-l border-[var(--erp-border)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => (
                <tr
                  key={rec.id}
                  className={cn(
                    'border-b border-[var(--erp-border)] hover:bg-[var(--erp-bg-hover)] transition-colors',
                    idx % 2 === 1 && 'bg-[var(--erp-bg)]/40',
                  )}
                >
                  {register.columns.map((col) => (
                    <td key={col.name} className="px-3 py-2 text-[var(--erp-text)] align-top">
                      <CellContent value={rec.data[col.name]} col={col} sequence={rec.sequence} />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right sticky right-0 bg-inherit border-l border-[var(--erp-border)]">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn title="View" onClick={() => setViewing(rec)}><Eye className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Edit" onClick={() => { setEditing(rec); setFormOpen(true); }}><Pencil className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Delete" danger onClick={() => setDeleteTarget(rec)}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && records.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px] text-[var(--erp-text-secondary)] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
            <span className="text-[var(--erp-text-muted)]">|</span>
            <span>Page {page} of {totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="text-[11px] py-1 px-2 rounded bg-[var(--erp-bg-input)] border border-[var(--erp-border)]"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
            <div className="flex items-center gap-0.5">
              <IconBtn title="First page" onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
                <ChevronLeft className="w-3.5 h-3.5 -ml-2" />
              </IconBtn>
              <IconBtn title="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </IconBtn>
              <IconBtn title="Next page" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-3.5 h-3.5" />
              </IconBtn>
              <IconBtn title="Last page" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                <ChevronRight className="w-3.5 h-3.5" />
                <ChevronRight className="w-3.5 h-3.5 -ml-2" />
              </IconBtn>
            </div>
          </div>
        </div>
      )}

      {/* Record form modal */}
      <RecordForm
        open={formOpen}
        register={register}
        record={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />

      {/* View record modal */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FAIcon name={register.icon} style={{ color: register.color }} />
              {register.name} — Record #{viewing?.sequence}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {register.columns.map((col) => (
              <div key={col.name} className="border border-[var(--erp-border)] rounded-md p-2.5">
                <div className="text-[10px] font-semibold text-[var(--erp-text-muted)] uppercase tracking-wide mb-1">{col.name}</div>
                <CellContent value={viewing?.data[col.name]} col={col} sequence={viewing?.sequence || 0} expanded />
              </div>
            ))}
          </div>
          <div className="text-[10px] text-[var(--erp-text-muted)] mt-2 flex items-center justify-between">
            <span>Created: {formatDate(viewing?.createdAt)}</span>
            <span>Updated: {formatTimeAgo(viewing?.updatedAt || '')}</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete record #{deleteTarget?.sequence} from "{register.name}".
              The record will be hidden but preserved in the audit log. This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[var(--erp-danger)] hover:bg-[var(--erp-danger)]/90"
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CellContent({ value, col, sequence, expanded }: { value: any; col: ColumnDef; sequence: number; expanded?: boolean }) {
  if (col.type === 'auto_increment') {
    const code = col.name.toLowerCase().includes('no') || col.name.toLowerCase().includes('number') || col.name.toLowerCase().includes('id') || col.name.toLowerCase().includes('code')
      ? guessPrefix(col.name) : guessPrefix(col.name);
    return <span className="font-mono text-[11px] text-[var(--erp-accent)] font-medium">{formatDocNumber(code, Number(value) || sequence)}</span>;
  }
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-[var(--erp-text-muted)]">—</span>;
  }
  if (col.type === 'status') {
    return <Badge variant={statusVariant(String(value))}>{String(value)}</Badge>;
  }
  if (col.type === 'priority') {
    return <Badge variant={priorityVariant(String(value))}>{String(value)}</Badge>;
  }
  if (col.type === 'multi_select') {
    const arr = Array.isArray(value) ? value : [value];
    return (
      <div className="flex flex-wrap gap-1">
        {arr.map((v, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--erp-bg-hover)] text-[var(--erp-text-secondary)]">
            {String(v)}
          </span>
        ))}
      </div>
    );
  }
  if (col.type === 'rating') {
    const n = Number(value) || 0;
    return (
      <span className="text-[var(--erp-warning)] text-[12px]" title={`${n}/5`}>
        {'★'.repeat(n)}<span className="text-[var(--erp-text-muted)]">{'☆'.repeat(5 - n)}</span>
      </span>
    );
  }
  if (col.type === 'currency') {
    const n = Number(value) || 0;
    return <span className="font-mono text-[var(--erp-text)]">{formatCurrencyDisplayLocal(n)}</span>;
  }
  if (col.type === 'percentage') {
    return <span>{value}%</span>;
  }
  if (col.type === 'number') {
    return <span className="font-mono">{String(value)}</span>;
  }
  if (col.type === 'date' || col.type === 'datetime') {
    return <span>{formatDate(String(value))}</span>;
  }
  if (col.type === 'email') {
    return <a href={`mailto:${value}`} className="text-[var(--erp-accent)] hover:underline">{String(value)}</a>;
  }
  if (col.type === 'phone') {
    return <a href={`tel:${value}`} className="text-[var(--erp-accent)] hover:underline">{String(value)}</a>;
  }
  if (col.type === 'long_text') {
    return (
      <div className={cn('text-[var(--erp-text)]', !expanded && 'line-clamp-2 max-w-[260px]')}>
        {String(value)}
      </div>
    );
  }
  return <span className="text-[var(--erp-text)]">{String(value)}</span>;
}

function formatCurrencyDisplayLocal(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(1)}K`;
  return `AED ${n.toLocaleString()}`;
}

function guessPrefix(colName: string): string {
  const n = colName.toLowerCase();
  if (n.includes('wo')) return 'WO';
  if (n.includes('pm')) return 'PM';
  if (n.includes('cm')) return 'CM';
  if (n.includes('ir')) return 'IR';
  if (n.includes('ai')) return 'AI';
  if (n.includes('ptw')) return 'PTW';
  if (n.includes('pr')) return 'PR';
  if (n.includes('mr')) return 'MR';
  if (n.includes('siv')) return 'SIV';
  if (n.includes('lr')) return 'LR';
  if (n.includes('tr')) return 'TR';
  if (n.includes('kpi')) return 'KPI';
  if (n.includes('cal')) return 'CAL';
  if (n.includes('asset')) return 'AST';
  if (n.includes('equip')) return 'EQP';
  if (n.includes('build')) return 'BLD';
  if (n.includes('vendor')) return 'VND';
  if (n.includes('contract')) return 'CON';
  if (n.includes('visitor')) return 'VST';
  if (n.includes('meeting')) return 'MTG';
  if (n.includes('inspection')) return 'SI';
  if (n.includes('risk')) return 'RA';
  if (n.includes('incident')) return 'IR';
  if (n.includes('accident')) return 'AI';
  if (n.includes('fire')) return 'FEI';
  if (n.includes('attendance')) return 'ATT';
  if (n.includes('toolbox')) return 'TT';
  if (n.includes('inventory')) return 'INV';
  if (n.includes('leave')) return 'LR';
  if (n.includes('training')) return 'TR';
  if (n.includes('housekeeping')) return 'HI';
  if (n.includes('log')) return 'LOG';
  return 'REC';
}

function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  const styles: Record<BadgeVariant, React.CSSProperties> = {
    success: { background: 'rgba(16,185,129,0.15)', color: 'var(--erp-success)' },
    warning: { background: 'rgba(245,158,11,0.15)', color: 'var(--erp-warning)' },
    danger:  { background: 'rgba(239,68,68,0.15)', color: 'var(--erp-danger)' },
    info:    { background: 'rgba(6,182,212,0.15)', color: 'var(--erp-info)' },
    accent:  { background: 'var(--erp-accent-dim)', color: 'var(--erp-accent)' },
    neutral: { background: 'var(--erp-bg-hover)', color: 'var(--erp-text-secondary)' },
    default: { background: 'var(--erp-bg-hover)', color: 'var(--erp-text-secondary)' },
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium whitespace-nowrap" style={styles[variant]}>
      {children}
    </span>
  );
}

function IconBtn({ children, title, onClick, disabled, danger }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded transition-colors',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[var(--erp-bg-hover)]',
        danger ? 'text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)]' : 'text-[var(--erp-text-secondary)] hover:text-[var(--erp-text)]',
      )}
    >
      {children}
    </button>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="p-4">
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-8 bg-[var(--erp-bg-hover)] rounded animate-pulse flex-1" style={{ animationDelay: `${i * 50 + j * 20}ms` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onAdd, registerName }: { onAdd: () => void; registerName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--erp-bg-hover)] flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-[var(--erp-text-muted)]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--erp-text)] mb-1">No records yet</h3>
      <p className="text-[12px] text-[var(--erp-text-muted)] mb-4 max-w-sm">
        There are no records in the "{registerName}" register. Add your first record to get started.
      </p>
      <Button onClick={onAdd} className="bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)] text-[12px] h-9">
        <Plus className="w-4 h-4 mr-1" /> Add First Record
      </Button>
    </div>
  );
}
