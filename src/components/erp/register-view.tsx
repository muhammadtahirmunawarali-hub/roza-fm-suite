'use client';

// FMCore ERP — Register View (grid mode with bulk actions, CSV import, print, workflow, saved views)
import { useEffect, useMemo, useState, useCallback } from 'react';
import { recordsApi, registersApi } from '@/lib/erp/api';
import type { Register, RecordData, ColumnDef } from '@/lib/erp/types';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import {
  formatDocNumber, statusVariant, priorityVariant,
  formatDate, formatTimeAgo, type BadgeVariant, displayColumnName,
} from '@/lib/erp/utils';
import { RecordForm } from './record-form';
import { CsvImport } from './csv-import';
import { BulkActions } from './bulk-actions';
import { printRecord } from './print-record';
import { ApprovalWorkflow } from './approval-workflow';
import { SavedViews } from './saved-views';
import { RecordDetailDrawer } from './record-detail-drawer';
import { EmptyStateIllustration } from './empty-state-illustration';
import { ColumnEditor } from './column-editor';
import {
  Plus, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Download, Upload, Printer, Trash2, Pencil, Eye, X, Inbox, FileText, Workflow, ChevronDown, Braces, Columns3, Settings2, Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

interface Props {
  registerId: string;
}

const PAGE_SIZES = [10, 25, 50, 100];

export function RegisterView({ registerId }: Props) {
  const { hasPermission, user, currency } = useErpStore();
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
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<RecordData | null>(null);
  const [viewing, setViewing] = useState<RecordData | null>(null);
  const [workflowTarget, setWorkflowTarget] = useState<RecordData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecordData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [company, setCompany] = useState({ name: 'FMCore Facilities Management', address: '', phone: '', email: '', tax_number: '' });
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);

  // Permission flags (register may be null initially)
  const regCode = register?.code || '';
  const canView = hasPermission(regCode || registerId, 'view');
  const canCreate = hasPermission(regCode, 'create');
  const canEdit = hasPermission(regCode, 'edit');
  const canDelete = hasPermission(regCode, 'delete');
  const canExport = hasPermission(regCode, 'export');
  const canImport = hasPermission(regCode, 'import');
  const canApprove = hasPermission(regCode, 'approve');
  const hasStatusCol = register?.columns.some((c) => c.type === 'status');

  // Visible columns (filtered by user's column visibility preferences)
  const visibleColumns = useMemo(() => {
    if (!register) return [];
    return register.columns.filter((c) => !hiddenColumns.has(c.name));
  }, [register, hiddenColumns]);

  const toggleColumn = (colName: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colName)) next.delete(colName);
      else next.add(colName);
      return next;
    });
  };

  // Load register meta + company settings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [regs, settings] = await Promise.all([registersApi.list(), fetch('/api/erp/settings').then((r) => r.json())]);
        const r = regs.find((x) => x.id === registerId);
        if (!cancelled && r) {
          setRegister(r);
          const autoCol = r.columns.find((c) => c.type === 'auto_increment');
          if (autoCol) { setSortField(autoCol.name); setSortDir('asc'); }
        }
        if (!cancelled && Array.isArray(settings)) {
          const map: Record<string, string> = {};
          settings.forEach((s: any) => (map[s.key] = s.value));
          setCompany({
            name: map['company.name'] || 'FMCore Facilities Management',
            address: map['company.address'] || '',
            phone: map['company.phone'] || '',
            email: map['company.email'] || '',
            tax_number: map['company.tax_number'] || '',
          });
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

  // Clear selection when page/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, debouncedSearch, filters, sortField, sortDir]);

  const loadRecords = useCallback(async () => {
    if (!register) return;
    setLoading(true);
    try {
      const res = await recordsApi.list(registerId, {
        page, pageSize, search: debouncedSearch, sortField, sortDir, filters,
      });
      setRecords(res.data);
      setTotal(res.total);
      // If a record is currently being viewed or edited, update it with the fresh data
      if (viewing) {
        const updated = res.data.find((r) => r.id === viewing.id);
        if (updated) setViewing(updated);
      }
      if (editing) {
        const updated = res.data.find((r) => r.id === editing.id);
        if (updated) setEditing(updated);
      }
    } catch (e: any) {
      toast.error('Failed to load records', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [register, registerId, page, pageSize, debouncedSearch, sortField, sortDir, filters, viewing, editing]);

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

  const exportJson = () => {
    if (!register || records.length === 0) return;
    const exportData = {
      register: {
        name: register.name,
        code: register.code,
        category: register.category,
        columns: register.columns,
      },
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      records: records.map((r) => ({
        id: r.id,
        sequence: r.sequence,
        data: r.data,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${register.code}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${records.length} records to JSON`);
  };

  const handlePrint = (recs: RecordData[]) => {
    if (!register) return;
    if (recs.length === 1) {
      printRecord(register, recs[0], company, currency);
    } else {
      // For multiple, print first one (limitation noted in UI)
      recs.slice(0, 5).forEach((r, i) => {
        setTimeout(() => printRecord(register, r, company, currency), i * 400);
      });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)));
    }
  };
  const selectedRecords = records.filter((r) => selectedIds.has(r.id));

  // Compute quick stats per register
  const stats = useMemo(() => {
    if (!register) return null;
    const statusCol = register.columns.find((c) => c.type === 'status');
    const priorityCol = register.columns.find((c) => c.type === 'priority');
    const currencyCol = register.columns.find((c) => c.type === 'currency');
    const out: { label: string; value: string | number; color: string }[] = [];
    out.push({ label: 'Total', value: total, color: 'var(--erp-text-secondary)' });
    if (statusCol && statusCol.options) {
      statusCol.options.slice(0, 3).forEach((opt) => {
        const count = records.filter((r) => r.data[statusCol.name] === opt).length;
        out.push({ label: opt, value: count, color: statusColorFor(opt) });
      });
    }
    if (priorityCol && priorityCol.options) {
      const critical = records.filter((r) => r.data[priorityCol.name] === 'Critical').length;
      if (critical > 0) out.push({ label: 'Critical', value: critical, color: 'var(--erp-danger)' });
    }
    if (currencyCol) {
      const sum = records.reduce((s, r) => s + (Number(r.data[currencyCol.name]) || 0), 0);
      out.push({ label: displayColumnName(currencyCol.name, currency) + ' (Σ)', value: formatCurrencyCompact(sum, currency), color: 'var(--erp-accent)' });
    }
    return out.slice(0, 6);
  }, [register, records, total]);

  if (!register) {
    return <div className="p-6 text-[var(--erp-text-muted)]">Loading register...</div>;
  }

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
              style={{ background: `linear-gradient(135deg, ${register.color}30, ${register.color}10)`, color: register.color }}
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
                <span className="px-1.5 py-0.5 rounded font-medium" style={{ background: register.color + '20', color: register.color }}>{register.category}</span>
                <span>·</span>
                <span>{register.columns.length} columns</span>
                <span>·</span>
                <span>{total} records</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <SavedViews
              registerId={register.id}
              registerName={register.name}
              currentFilters={{ search: debouncedSearch, filters, sortField, sortDir }}
              onApply={(v) => {
                setSearch(v.search || '');
                setFilters(v.filters || {});
                setSortField(v.sortField || '');
                setSortDir(v.sortDir || 'asc');
                setPage(1);
              }}
            />
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} className="h-8 text-[12px]">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filters
              {Object.values(filters).filter(Boolean).length > 0 && (
                <span className="ml-1 px-1.5 rounded-full bg-[var(--erp-accent)] text-white text-[9px]">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </Button>
            {/* Column Visibility Toggle */}
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowColumnToggle((v) => !v)} className="h-8 text-[12px]">
                <Columns3 className="w-3.5 h-3.5 mr-1" /> Columns
                {hiddenColumns.size > 0 && (
                  <span className="ml-1 px-1.5 rounded-full bg-[var(--erp-accent)] text-white text-[9px]">
                    {hiddenColumns.size}
                  </span>
                )}
              </Button>
              {showColumnToggle && (
                <div className="absolute top-full left-0 mt-1 w-56 max-h-[300px] overflow-y-auto bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-md shadow-xl z-30 p-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--erp-text-muted)] px-2 py-1 mb-1 border-b border-[var(--erp-border)]">Toggle Columns</div>
                  {register.columns.map((col) => (
                    <label key={col.name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--erp-bg-hover)] cursor-pointer text-[11px]">
                      <Checkbox
                        checked={!hiddenColumns.has(col.name)}
                        onCheckedChange={() => toggleColumn(col.name)}
                      />
                      <span className="text-[var(--erp-text-secondary)] flex-1 truncate">{displayColumnName(col.name, currency)}</span>
                      <span className="text-[9px] text-[var(--erp-text-muted)]">{col.type.replace('_', ' ')}</span>
                    </label>
                  ))}
                  {hiddenColumns.size > 0 && (
                    <button
                      onClick={() => setHiddenColumns(new Set())}
                      className="w-full text-[10px] text-[var(--erp-accent)] hover:underline py-1.5 mt-1 border-t border-[var(--erp-border)]"
                    >
                      Show all columns
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Edit Columns (rename/retype/add/delete) */}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setColumnEditorOpen(true)} className="h-8 text-[12px]" title="Edit column structure">
                <Settings2 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
            {canImport && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="h-8 text-[12px]">
                <Upload className="w-3.5 h-3.5 mr-1" /> Import
              </Button>
            )}
            {canExport && (
              <div className="relative group">
                <Button variant="outline" size="sm" className="h-8 text-[12px]">
                  <Download className="w-3.5 h-3.5 mr-1" /> Export
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </Button>
                <div className="absolute top-full right-0 mt-1 w-40 bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-md shadow-lg z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button onClick={exportCsv} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)] transition-colors border-b border-[var(--erp-border)]">
                    <FileText className="w-3 h-3" /> Export as CSV
                  </button>
                  <button onClick={exportJson} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)] transition-colors">
                    <Braces className="w-3 h-3" /> Export as JSON
                  </button>
                </div>
              </div>
            )}
            {canCreate && (
              <Button
                size="sm"
                onClick={() => { setEditing(null); setFormOpen(true); }}
                className="h-8 text-[12px] bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
              </Button>
            )}
            {/* Delete Register (Super Admin / Admin only) */}
            {(user?.role === 'Super Admin' || user?.role === 'Administrator') && !register.isSystem && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete the entire "${register.name}" register?\n\nThis will move ALL ${total} records to the Recycle Bin. The register itself will be soft-deleted and can be recovered from Settings.\n\nAre you sure?`)) {
                    registersApi.remove(registerId).then(() => {
                      toast.success(`Register "${register.name}" deleted — records moved to Recycle Bin`);
                      // Close the tab and go back to dashboard
                      window.location.reload();
                    }).catch((e: any) => {
                      toast.error('Failed to delete register', { description: e.message });
                    });
                  }
                }}
                className="h-8 text-[12px] text-[var(--erp-danger)] border-[var(--erp-danger)]/30 hover:bg-[var(--erp-danger)]/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Register
              </Button>
            )}
          </div>
        </div>

        {/* Permission notice for read-only users */}
        {!canCreate && !canEdit && !canDelete && canView && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--erp-text-muted)]">
            <FAIcon name="fa-eye" className="text-[9px]" />
            <span>Read-only access — you can view records but not modify them</span>
          </div>
        )}

        {/* Stats strip */}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-4 mt-3 text-[11px] flex-wrap">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[var(--erp-text-muted)]">{s.label}:</span>
                <span className="font-semibold text-[var(--erp-text)]">{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Status Filter Pills */}
        {hasStatusCol && filterableCols.length > 0 && (() => {
          const statusCol = register.columns.find((c) => c.type === 'status');
          if (!statusCol?.options) return null;
          const activeFilter = filters[statusCol.name];
          return (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-[var(--erp-text-muted)] mr-1">Quick Filter:</span>
              <button
                onClick={() => { setFilters((f) => { const n = { ...f }; delete n[statusCol.name]; return n; }); setPage(1); }}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                  !activeFilter
                    ? 'bg-[var(--erp-accent)] text-white'
                    : 'bg-[var(--erp-bg-input)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]',
                )}
              >
                All
              </button>
              {statusCol.options.map((opt) => {
                const count = records.filter((r) => r.data[statusCol.name] === opt).length;
                if (count === 0) return null;
                return (
                  <button
                    key={opt}
                    onClick={() => { setFilters((f) => ({ ...f, [statusCol.name]: activeFilter === opt ? '' : opt })); setPage(1); }}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors flex items-center gap-1',
                      activeFilter === opt
                        ? 'bg-[var(--erp-accent)] text-white'
                        : 'bg-[var(--erp-bg-input)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]',
                    )}
                  >
                    {opt}
                    <span className={cn('text-[8px] px-1 rounded-full', activeFilter === opt ? 'bg-white/20' : 'bg-[var(--erp-bg-hover)]')}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}

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
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
                  <option value="">{displayColumnName(col.name, currency)}: All</option>
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

      {/* Bulk actions bar (only when rows are selected) */}
      <BulkActions
        register={register}
        selectedIds={selectedIds}
        selectedRecords={selectedRecords}
        totalRecords={records.length}
        onClear={() => setSelectedIds(new Set())}
        onRefresh={loadRecords}
        onPrint={handlePrint}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <TableSkeleton cols={register.columns.length} />
        ) : records.length === 0 ? (
          <EmptyState
            onAdd={() => { setEditing(null); setFormOpen(true); }}
            onImport={() => setImportOpen(true)}
            registerName={register.name}
            hasSearch={!!search || Object.values(filters).some(Boolean)}
          />
        ) : (
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--erp-bg-elevated)] border-b border-[var(--erp-border)]">
                <th className="w-9 px-2 py-2 border-r border-[var(--erp-border)] sticky left-0 bg-[var(--erp-bg-elevated)] z-20">
                  <Checkbox
                    checked={selectedIds.size === records.length && records.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all rows"
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.name}
                    onClick={() => toggleSort(col.name)}
                    className="px-3 py-2 text-left font-semibold text-[var(--erp-text-secondary)] text-[11px] uppercase tracking-wide cursor-pointer hover:bg-[var(--erp-bg-hover)] select-none whitespace-nowrap"
                    style={{ minWidth: col.width || 120 }}
                  >
                    <div className="flex items-center gap-1">
                      <span>{displayColumnName(col.name, currency)}</span>
                      {sortField === col.name ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[var(--erp-accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--erp-accent)]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-semibold text-[var(--erp-text-secondary)] text-[11px] uppercase tracking-wide sticky right-0 bg-[var(--erp-bg-elevated)] border-l border-[var(--erp-border)] z-20 min-w-[120px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => {
                const isSelected = selectedIds.has(rec.id);
                return (
                  <tr
                    key={rec.id}
                    className={cn(
                      'border-b border-[var(--erp-border)] hover:bg-[var(--erp-bg-hover)] transition-colors',
                      idx % 2 === 1 && !isSelected && 'bg-[var(--erp-bg)]/40',
                      isSelected && 'bg-[var(--erp-accent-dim)] hover:bg-[var(--erp-accent-dim)]',
                    )}
                  >
                    <td className="w-9 px-2 py-2 border-r border-[var(--erp-border)] sticky left-0 bg-inherit z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(rec.id)}
                        aria-label={`Select record ${rec.sequence}`}
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.name} className="px-3 py-2 text-[var(--erp-text)] align-top">
                        <CellContent value={rec.data[col.name]} col={col} sequence={rec.sequence} registerCode={register.code} currency={currency} />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right sticky right-0 bg-inherit border-l border-[var(--erp-border)] z-10">
                      <div className="flex items-center justify-end gap-1">
                        <ActionBtn title="View record" onClick={() => setViewing(rec)} icon={<Eye className="w-3.5 h-3.5" />} label="View" />
                        {hasStatusCol && (canApprove || canEdit) && (
                          <ActionBtn title="Workflow" onClick={() => setWorkflowTarget(rec)} icon={<Workflow className="w-3.5 h-3.5" />} label="Flow" accent />
                        )}
                        {canEdit && (
                          <ActionBtn title="Edit record" onClick={() => { setEditing(rec); setFormOpen(true); }} icon={<Pencil className="w-3.5 h-3.5" />} label="Edit" />
                        )}
                        <IconBtn title="Print" onClick={() => handlePrint([rec])}><Printer className="w-3.5 h-3.5" /></IconBtn>
                        {canDelete && (
                          <IconBtn title="Delete" danger onClick={() => setDeleteTarget(rec)}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
            {selectedIds.size > 0 && (
              <>
                <span className="text-[var(--erp-text-muted)]">|</span>
                <span className="text-[var(--erp-accent)] font-medium">{selectedIds.size} selected</span>
              </>
            )}
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

      {/* CSV Import modal */}
      <CsvImport
        open={importOpen}
        register={register}
        onClose={() => setImportOpen(false)}
        onImported={() => { loadRecords(); }}
      />

      {/* Record detail drawer (replaces View modal) */}
      <RecordDetailDrawer
        key={viewing?.id || 'none'}
        open={!!viewing}
        register={register}
        record={viewing}
        company={company}
        onClose={() => setViewing(null)}
        onEdit={() => { if (viewing) { setEditing(viewing); setViewing(null); setFormOpen(true); } }}
        onRefresh={loadRecords}
      />

      {/* Approval workflow modal */}
      <ApprovalWorkflow
        open={!!workflowTarget}
        register={register}
        record={workflowTarget}
        onClose={() => setWorkflowTarget(null)}
        onTransition={() => { setWorkflowTarget(null); loadRecords(); }}
      />

      {/* Column Editor modal */}
      <ColumnEditor
        open={columnEditorOpen}
        register={register}
        onClose={() => setColumnEditorOpen(false)}
        onSaved={() => { loadRecords(); }}
      />

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

function colIconFor(type: string): string {
  switch (type) {
    case 'auto_increment': return 'fa-hashtag';
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

function statusColorFor(status: string): string {
  const s = status.toLowerCase();
  if (['open', 'draft', 'submitted', 'pending', 'scheduled', 'reported', 'due', 'under review', 'on track', 'at risk'].includes(s)) return 'var(--erp-warning)';
  if (['in progress', 'active', 'approved', 'issued', 'on order', 'in stock', 'operational', 'compliant', 'calibrated', 'pass', 'achieved', 'exceeded', 'present', 'completed', 'paid'].includes(s)) return 'var(--erp-success)';
  if (['overdue', 'critical', 'rejected', 'cancelled', 'fail', 'non-compliant', 'expired', 'out of service', 'beyond repair', 'terminated', 'blacklisted', 'suspended', 'absent'].includes(s)) return 'var(--erp-danger)';
  return 'var(--erp-info)';
}

function formatCurrencyCompact(n: number, currency = 'AED'): string {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${currency} ${(n / 1_000).toFixed(1)}K`;
  return `${currency} ${n.toLocaleString()}`;
}

function CellContent({ value, col, sequence, registerCode, expanded, currency = 'AED' }: { value: any; col: ColumnDef; sequence: number; registerCode: string; expanded?: boolean; currency?: string }) {
  if (col.type === 'auto_increment') {
    const prefix = guessPrefix(col.name, registerCode);
    return <span className="font-mono text-[11px] text-[var(--erp-accent)] font-medium">{formatDocNumber(prefix, Number(value) || sequence)}</span>;
  }
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-[var(--erp-text-muted)]">—</span>;
  }
  if (col.type === 'status') {
    return <Badge variant={statusVariant(String(value))} icon={statusIcon(String(value))}>{String(value)}</Badge>;
  }
  if (col.type === 'priority') {
    return <Badge variant={priorityVariant(String(value))} icon={priorityIcon(String(value))}>{String(value)}</Badge>;
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
    return <span className="font-mono text-[var(--erp-text)]">{formatCurrencyCompact(n, currency)}</span>;
  }
  if (col.type === 'percentage') {
    const n = Number(value) || 0;
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono">{n}%</span>
        <span className="w-12 h-1.5 rounded-full bg-[var(--erp-bg-hover)] overflow-hidden">
          <span className="block h-full rounded-full" style={{ width: `${Math.min(100, n)}%`, background: 'var(--erp-accent)' }} />
        </span>
      </span>
    );
  }
  if (col.type === 'number') {
    return <span className="font-mono">{String(value)}</span>;
  }
  if (col.type === 'date') {
    return <span>{formatDate(String(value))}</span>;
  }
  if (col.type === 'datetime') {
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
  if (col.type === 'image') {
    const src = String(value);
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="inline-block">
        <img src={src} alt="thumbnail" className="w-10 h-10 object-cover rounded-md border border-[var(--erp-border)] hover:border-[var(--erp-accent)] transition-colors" />
      </a>
    );
  }
  if (col.type === 'url') {
    const url = String(value);
    const display = url.replace(/^https?:\/\//, '').slice(0, 30);
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--erp-accent)] hover:underline inline-flex items-center gap-1 max-w-[180px]">
        <LinkIcon className="w-3 h-3 shrink-0" />
        <span className="truncate">{display}{url.length > 30 ? '…' : ''}</span>
      </a>
    );
  }
  if (col.type === 'color') {
    const c = String(value);
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="w-5 h-5 rounded border border-[var(--erp-border)]" style={{ background: c }} />
        <span className="font-mono text-[10px] text-[var(--erp-text-secondary)]">{c}</span>
      </span>
    );
  }
  if (col.type === 'tags') {
    const arr = Array.isArray(value) ? value : String(value).split(',').map((s) => s.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {arr.map((v, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] font-medium border border-[var(--erp-accent-border)]">
            #{String(v)}
          </span>
        ))}
      </div>
    );
  }
  return <span className="text-[var(--erp-text)]">{String(value)}</span>;
}

function statusIcon(status: string): string {
  const s = status.toLowerCase();
  if (['open', 'draft', 'submitted', 'pending', 'scheduled', 'reported', 'due'].includes(s)) return 'fa-clock';
  if (['in progress', 'active', 'approved', 'issued', 'on order', 'in stock', 'operational', 'compliant', 'pass'].includes(s)) return 'fa-circle-check';
  if (['overdue', 'critical', 'rejected', 'cancelled', 'fail', 'expired', 'out of service', 'terminated', 'suspended', 'absent'].includes(s)) return 'fa-circle-xmark';
  if (['closed', 'completed', 'achieved', 'exceeded'].includes(s)) return 'fa-flag-checkered';
  return 'fa-circle';
}

function priorityIcon(priority: string): string {
  const p = priority.toLowerCase();
  if (p === 'critical') return 'fa-triangle-exclamation';
  if (p === 'high') return 'fa-arrow-up';
  if (p === 'medium') return 'fa-equals';
  if (p === 'low') return 'fa-arrow-down';
  return 'fa-circle';
}

function guessPrefix(colName: string, registerCode: string): string {
  // Prefer register code (more accurate) — take first 3 letters uppercase
  const codePrefix = registerCode.slice(0, 3).toUpperCase();
  if (codePrefix) return codePrefix;
  const n = colName.toLowerCase();
  if (n.includes('wo')) return 'WO';
  if (n.includes('pm')) return 'PM';
  if (n.includes('cm')) return 'CM';
  return 'REC';
}

function Badge({ variant, children, icon }: { variant: BadgeVariant; children: React.ReactNode; icon?: string }) {
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium whitespace-nowrap" style={styles[variant]}>
      {icon && <FAIcon name={icon} className="text-[9px]" />}
      {children}
    </span>
  );
}

function IconBtn({ children, title, onClick, disabled, danger, accent }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; danger?: boolean; accent?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded transition-colors',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[var(--erp-bg-hover)]',
        danger ? 'text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)]'
          : accent ? 'text-[var(--erp-accent)] hover:bg-[var(--erp-accent-dim)]'
          : 'text-[var(--erp-text-secondary)] hover:text-[var(--erp-text)]',
      )}
    >
      {children}
    </button>
  );
}

// Action button with icon only — NO text label (prevents overflow when scrolling right)
function ActionBtn({ title, onClick, icon, label, accent }: { title: string; onClick: () => void; icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-medium transition-colors border shrink-0',
        accent
          ? 'border-[var(--erp-accent-border)] text-[var(--erp-accent)] hover:bg-[var(--erp-accent-dim)]'
          : 'border-[var(--erp-border)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)] hover:border-[var(--erp-accent-border)]',
      )}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: cols + 2 }).map((_, j) => (
            <div key={j} className="h-8 bg-[var(--erp-bg-hover)] rounded animate-pulse flex-1" style={{ animationDelay: `${i * 50 + j * 20}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd, onImport, registerName, hasSearch }: { onAdd: () => void; onImport: () => void; registerName: string; hasSearch?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <EmptyStateIllustration type={hasSearch ? 'no-results' : 'no-records'} size={120} className="mb-4" />
      <h3 className="text-[15px] font-semibold text-[var(--erp-text)] mb-1">
        {hasSearch ? 'No records match your search' : 'No records yet'}
      </h3>
      <p className="text-[12px] text-[var(--erp-text-muted)] mb-4 max-w-sm">
        {hasSearch
          ? `Try adjusting your search or filters to find what you're looking for.`
          : `There are no records in the "${registerName}" register. Add your first record or import from CSV.`}
      </p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button onClick={onAdd} className="bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)] text-[12px] h-9">
          <Plus className="w-4 h-4 mr-1" /> Add First Record
        </Button>
        {!hasSearch && (
          <Button variant="outline" onClick={onImport} className="text-[12px] h-9">
            <Upload className="w-4 h-4 mr-1" /> Import CSV
          </Button>
        )}
      </div>
    </div>
  );
}
