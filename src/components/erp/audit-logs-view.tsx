'use client';

// Roza FM Suite — Audit Logs view (with proper Dialog + styling polish)
import { useEffect, useState } from 'react';
import { auditApi } from '@/lib/erp/api';
import type { AuditLog } from '@/lib/erp/types';
import { cn } from '@/lib/utils';
import { formatDateTime, formatTimeAgo, type BadgeVariant } from '@/lib/erp/utils';
import { History, Search, ChevronLeft, ChevronRight, Download, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FAIcon } from './icon';
import { EmptyStateIllustration } from './empty-state-illustration';

const ACTION_META: Record<string, { color: string; icon: string; variant: BadgeVariant }> = {
  Created:   { color: 'var(--erp-success)', icon: 'fa-plus',           variant: 'success' },
  Updated:   { color: 'var(--erp-info)',    icon: 'fa-pen',            variant: 'info' },
  Deleted:   { color: 'var(--erp-danger)',  icon: 'fa-trash',          variant: 'danger' },
  Approved:  { color: 'var(--erp-accent)',  icon: 'fa-check',          variant: 'accent' },
  Cancelled: { color: 'var(--erp-warning)', icon: 'fa-ban',            variant: 'warning' },
  Imported:  { color: 'var(--erp-accent)',  icon: 'fa-file-import',    variant: 'accent' },
  Exported:  { color: 'var(--erp-info)',    icon: 'fa-file-export',   variant: 'info' },
};

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({ page, pageSize, module: moduleFilter });
      setLogs(res.data);
      setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, moduleFilter]);
  useEffect(() => { setPage(1); }, [moduleFilter, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Apply action filter + text search client-side (audit logs are usually small)
  const filteredLogs = logs
    .filter((l) => actionFilter === 'all' || l.action.toLowerCase() === actionFilter.toLowerCase())
    .filter((l) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.summary?.toLowerCase().includes(q) ||
        l.module?.toLowerCase().includes(q) ||
        l.userName?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q)
      );
    });

  const exportCsv = () => {
    if (filteredLogs.length === 0) { toast.info('No logs to export'); return; }
    const headers = ['When', 'User', 'Action', 'Module', 'Summary'];
    const rows = filteredLogs.map((l) => [
      formatDateTime(l.createdAt),
      l.userName || 'System',
      l.action,
      l.module,
      l.summary.replace(/"/g, '""'),
    ].map((v) => `"${v}"`));
    const csv = [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} audit logs`);
  };

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)]">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(100,116,139,0.2), rgba(100,116,139,0.05))', color: 'var(--erp-text-secondary)' }}>
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-[var(--erp-text)]" style={{ fontFamily: 'var(--font-display)' }}>
                Audit Logs
              </h1>
              <p className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">
                Every create, update, and delete action is tracked for compliance and traceability.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search summary, user, module..."
                className="pl-8 pr-3 py-1.5 text-[12px] rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] focus:outline-none focus:border-[var(--erp-accent)] focus:ring-1 focus:ring-[var(--erp-accent-border)] w-[220px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
              <input
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                placeholder="Filter by module..."
                className="pl-8 pr-3 py-1.5 text-[12px] rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] focus:outline-none focus:border-[var(--erp-accent)] focus:ring-1 focus:ring-[var(--erp-accent-border)] w-[180px]"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 text-[12px] bg-[var(--erp-bg-input)] w-[140px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[12px]">All actions</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a.toLowerCase()} className="text-[12px]">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv} className="h-8 text-[12px]">
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 mt-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-[var(--erp-text-muted)]">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--erp-success)' }} />
            Created {filteredLogs.filter((l) => l.action === 'Created').length}
          </span>
          <span className="flex items-center gap-1.5 text-[var(--erp-text-muted)]">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--erp-info)' }} />
            Updated {filteredLogs.filter((l) => l.action === 'Updated').length}
          </span>
          <span className="flex items-center gap-1.5 text-[var(--erp-text-muted)]">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--erp-danger)' }} />
            Deleted {filteredLogs.filter((l) => l.action === 'Deleted').length}
          </span>
          <span className="text-[var(--erp-text-muted)]">·</span>
          <span className="text-[var(--erp-text-secondary)]">{total} total events</span>
          {(searchQuery || actionFilter !== 'all' || moduleFilter) && (
            <>
              <span className="text-[var(--erp-text-muted)]">·</span>
              <span className="text-[var(--erp-accent)] font-medium">{filteredLogs.length} matching</span>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-[var(--erp-bg-hover)] rounded animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <EmptyStateIllustration type="no-audit" size={120} className="mb-3" />
            <h3 className="text-[14px] font-semibold text-[var(--erp-text)] mb-1">No audit logs found</h3>
            <p className="text-[12px] text-[var(--erp-text-muted)] max-w-xs">
              {moduleFilter || actionFilter !== 'all' || searchQuery
                ? 'Try adjusting your filters or search query to see more events.'
                : 'Audit logs will appear here as users interact with the system.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--erp-bg-elevated)] border-b border-[var(--erp-border)]">
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">When</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">User</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">Action</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">Module</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">Summary</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => {
                const meta = ACTION_META[log.action] || { color: 'var(--erp-text-muted)', icon: 'fa-circle', variant: 'neutral' as BadgeVariant };
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className={cn(
                      'border-b border-[var(--erp-border)] hover:bg-[var(--erp-bg-hover)] cursor-pointer transition-colors',
                      idx % 2 === 1 && 'bg-[var(--erp-bg)]/40',
                    )}
                  >
                    <td className="px-4 py-2.5 text-[var(--erp-text-muted)] whitespace-nowrap text-[11px]">
                      <div>{formatTimeAgo(log.createdAt)}</div>
                      <div className="text-[10px] text-[var(--erp-text-muted)]/70">{formatDateTime(log.createdAt).split(',')[0]}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--erp-bg-hover)] flex items-center justify-center text-[10px] font-semibold text-[var(--erp-text-secondary)] shrink-0">
                          {(log.userName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[var(--erp-text-secondary)]">{log.userName || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: meta.color + '20', color: meta.color }}
                      >
                        <FAIcon name={meta.icon} className="text-[9px]" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--erp-text-secondary)]">{log.module}</td>
                    <td className="px-4 py-2.5 text-[var(--erp-text)]">{log.summary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px] text-[var(--erp-text-secondary)]">
        <span>Showing {filteredLogs.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px]">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Detail dialog — uses shadcn Dialog (handles Escape automatically) */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && (() => {
                const meta = ACTION_META[selected.action] || { color: 'var(--erp-text-muted)', icon: 'fa-circle' };
                return (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: meta.color + '20', color: meta.color }}
                  >
                    <FAIcon name={meta.icon} className="text-[9px]" />
                    {selected.action}
                  </span>
                );
              })()}
              Audit Log Detail
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <DetailField label="When" value={formatDateTime(selected.createdAt)} />
                <DetailField label="User" value={selected.userName || 'System'} />
                <DetailField label="Action" value={selected.action} />
                <DetailField label="Module" value={selected.module} />
                {selected.registerId && <DetailField label="Register ID" value={selected.registerId} mono />}
                {selected.recordId && <DetailField label="Record ID" value={selected.recordId} mono />}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--erp-text-muted)] mb-1">Summary</div>
                <div className="text-[12px] text-[var(--erp-text)] bg-[var(--erp-bg-input)] p-3 rounded-md border border-[var(--erp-border)]">
                  {selected.summary}
                </div>
              </div>
              {selected.oldValue && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--erp-text-muted)] mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--erp-danger)' }} />
                    Old Value (before)
                  </div>
                  <pre className="text-[11px] bg-[var(--erp-bg)] p-3 rounded-md border border-[var(--erp-border)] overflow-x-auto font-mono leading-relaxed">
                    {JSON.stringify(selected.oldValue, null, 2)}
                  </pre>
                </div>
              )}
              {selected.newValue && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--erp-text-muted)] mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--erp-success)' }} />
                    New Value (after)
                  </div>
                  <pre className="text-[11px] bg-[var(--erp-bg)] p-3 rounded-md border border-[var(--erp-border)] overflow-x-auto font-mono leading-relaxed">
                    {JSON.stringify(selected.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border border-[var(--erp-border)] rounded-md p-2.5 bg-[var(--erp-bg-card)]">
      <div className="text-[10px] uppercase tracking-wide text-[var(--erp-text-muted)] mb-0.5">{label}</div>
      <div className={cn('text-[12px] text-[var(--erp-text)] truncate', mono && 'font-mono text-[11px]')}>{value}</div>
    </div>
  );
}
