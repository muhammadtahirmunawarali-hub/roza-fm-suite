'use client';

// FMCore ERP — Audit Logs view
import { useEffect, useState } from 'react';
import { auditApi } from '@/lib/erp/api';
import type { AuditLog } from '@/lib/erp/types';
import { cn } from '@/lib/utils';
import { formatDateTime, formatTimeAgo } from '@/lib/erp/utils';
import { History, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [module, setModule] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({ page, pageSize, module });
      setLogs(res.data);
      setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, module]);
  useEffect(() => { setPage(1); }, [module]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const actionColor = (action: string): string => {
    switch (action) {
      case 'Created': return 'var(--erp-success)';
      case 'Updated': return 'var(--erp-info)';
      case 'Deleted': return 'var(--erp-danger)';
      case 'Imported': return 'var(--erp-accent)';
      default: return 'var(--erp-text-muted)';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-3 border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)]">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--erp-bg-hover)] text-[var(--erp-text-secondary)]">
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
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
              <input
                value={module}
                onChange={(e) => setModule(e.target.value)}
                placeholder="Filter by module..."
                className="pl-8 pr-3 py-1.5 text-[12px] rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] focus:outline-none focus:border-[var(--erp-accent)] w-[180px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 text-center text-[var(--erp-text-muted)] text-[12px]">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-[var(--erp-text-muted)] text-[12px]">No audit logs found</div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--erp-bg-elevated)] border-b border-[var(--erp-border)]">
                <th className="px-4 py-2 text-left text-[11px] uppercase text-[var(--erp-text-secondary)]">When</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-[var(--erp-text-secondary)]">User</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-[var(--erp-text-secondary)]">Action</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-[var(--erp-text-secondary)]">Module</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-[var(--erp-text-secondary)]">Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelected(log)}
                  className="border-b border-[var(--erp-border)] hover:bg-[var(--erp-bg-hover)] cursor-pointer"
                >
                  <td className="px-4 py-2 text-[var(--erp-text-muted)] whitespace-nowrap">{formatTimeAgo(log.createdAt)}</td>
                  <td className="px-4 py-2 text-[var(--erp-text-secondary)]">{log.userName || 'System'}</td>
                  <td className="px-4 py-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: actionColor(log.action) + '20', color: actionColor(log.action) }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--erp-text-secondary)]">{log.module}</td>
                  <td className="px-4 py-2 text-[var(--erp-text)]">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px] text-[var(--erp-text-secondary)]">
        <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
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

      {/* Detail dialog */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[var(--erp-text)]">Audit Log Detail</h3>
              <button onClick={() => setSelected(null)} className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><span className="text-[var(--erp-text-muted)]">When:</span> <span className="text-[var(--erp-text)]">{formatDateTime(selected.createdAt)}</span></div>
                <div><span className="text-[var(--erp-text-muted)]">User:</span> <span className="text-[var(--erp-text)]">{selected.userName || 'System'}</span></div>
                <div><span className="text-[var(--erp-text-muted)]">Action:</span> <span className="text-[var(--erp-text)]">{selected.action}</span></div>
                <div><span className="text-[var(--erp-text-muted)]">Module:</span> <span className="text-[var(--erp-text)]">{selected.module}</span></div>
              </div>
              <div className="text-[12px] text-[var(--erp-text)] bg-[var(--erp-bg-input)] p-3 rounded-md border border-[var(--erp-border)]">
                {selected.summary}
              </div>
              {selected.oldValue && (
                <div>
                  <div className="text-[10px] uppercase text-[var(--erp-text-muted)] mb-1">Old Value</div>
                  <pre className="text-[11px] bg-[var(--erp-bg)] p-3 rounded-md border border-[var(--erp-border)] overflow-x-auto font-mono">
                    {JSON.stringify(selected.oldValue, null, 2)}
                  </pre>
                </div>
              )}
              {selected.newValue && (
                <div>
                  <div className="text-[10px] uppercase text-[var(--erp-text-muted)] mb-1">New Value</div>
                  <pre className="text-[11px] bg-[var(--erp-bg)] p-3 rounded-md border border-[var(--erp-border)] overflow-x-auto font-mono">
                    {JSON.stringify(selected.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
