'use client';

// FMCore ERP — Recent Records Widget (for Dashboard)
// Shows the most recently created/updated records across all registers.
import { useEffect, useState } from 'react';
import { auditApi, registersApi } from '@/lib/erp/api';
import type { Register } from '@/lib/erp/types';
import { FAIcon } from './icon';
import { useErpStore } from '@/lib/erp/store';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/erp/utils';
import { Clock, Plus, Pencil, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { EmptyStateIllustration } from './empty-state-illustration';

interface AuditEntry {
  id: string;
  action: string;
  module: string;
  summary: string;
  userName: string;
  createdAt: string;
  registerId?: string | null;
}

export function RecentRecordsWidget() {
  const { openTab, registers } = useErpStore() as any;
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    auditApi.list({ page: 1, pageSize: 8 }).then((res) => {
      if (!cancelled) {
        // Filter to only Created actions for "recent records" feel
        const created = res.data.filter((e: any) => e.action === 'Created' || e.action === 'Updated');
        setEntries(created.slice(0, 6));
      }
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const actionIcons: Record<string, React.ReactNode> = {
    Created: <Plus className="w-3 h-3" />,
    Updated: <Pencil className="w-3 h-3" />,
    Deleted: <Trash2 className="w-3 h-3" />,
    Approved: <CheckCircle2 className="w-3 h-3" />,
  };

  const actionColors: Record<string, string> = {
    Created: 'var(--erp-success)',
    Updated: 'var(--erp-info)',
    Deleted: 'var(--erp-danger)',
    Approved: 'var(--erp-accent)',
  };

  const handleClick = (entry: AuditEntry) => {
    // Try to open the register if we can find it
    const reg = registers?.find((r: Register) => r.name === entry.module);
    if (reg) {
      openTab({ id: `reg_${reg.id}`, type: 'register', label: reg.name, icon: reg.icon, refId: reg.id });
    }
  };

  return (
    <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
        <h3 className="font-semibold text-[13px] text-[var(--erp-text)] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--erp-accent)]" /> Recent Records
        </h3>
        <span className="text-[10px] text-[var(--erp-text-muted)]">{loading ? 'Loading...' : `${entries.length} recent`}</span>
      </div>
      <div className="divide-y divide-[var(--erp-border)] max-h-[300px] overflow-y-auto flex-1">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-[var(--erp-bg-hover)] rounded animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-[var(--erp-text-muted)] text-[12px]">No recent activity</div>
        ) : (
          entries.map((entry) => {
            const reg = registers?.find((r: Register) => r.name === entry.module);
            const color = actionColors[entry.action] || 'var(--erp-text-muted)';
            return (
              <button
                key={entry.id}
                onClick={() => handleClick(entry)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--erp-bg-hover)] transition-colors text-left"
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: color + '20', color }}
                >
                  {actionIcons[entry.action] || <Clock className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[var(--erp-text)] truncate">{entry.summary}</div>
                  <div className="text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium">{entry.userName || 'System'}</span>
                    <span>·</span>
                    <span>{entry.module}</span>
                    <span>·</span>
                    <span>{formatTimeAgo(entry.createdAt)}</span>
                  </div>
                </div>
                {reg && (
                  <ArrowRight className="w-3 h-3 text-[var(--erp-text-muted)] shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
