'use client';

// FMCore ERP — System Overview Widget (for Dashboard)
// Compact card showing key system statistics at a glance.
import { useEffect, useState } from 'react';
import { statsApi, type SystemStats } from '@/lib/erp/api';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { Server, Database, Users, Bell, CheckCircle2, AlertTriangle } from 'lucide-react';

export function SystemOverviewWidget() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    statsApi.get().then((s) => {
      if (!cancelled) setStats(s);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg p-4 animate-pulse h-[120px]" />
    );
  }

  if (!stats) return null;

  const items = [
    { label: 'Registers', value: stats.registers, icon: 'fa-table-list', color: '#64748B' },
    { label: 'Records', value: stats.records, icon: 'fa-database', color: '#06B6D4' },
    { label: 'Users', value: stats.activeUsers, icon: 'fa-user-check', color: '#10B981' },
    { label: 'Sessions', value: stats.activeSessions, icon: 'fa-key', color: '#8B5CF6' },
    { label: 'Alerts', value: stats.unreadNotifs, icon: 'fa-bell', color: stats.unreadNotifs > 0 ? '#EF4444' : '#94A3B8' },
    { label: 'Audit', value: stats.auditLogs, icon: 'fa-list-ul', color: '#F59E0B' },
  ];

  return (
    <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <Server className="w-3.5 h-3.5 text-[var(--erp-accent)]" />
        <h3 className="text-[12px] font-semibold text-[var(--erp-text)] uppercase tracking-wide">System Overview</h3>
        <span className="ml-auto flex items-center gap-1 text-[9px] text-[var(--erp-success)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--erp-success)] animate-pulse" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-[var(--erp-bg-hover)] transition-colors">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ background: item.color + '20', color: item.color }}
            >
              <FAIcon name={item.icon} className="text-[11px]" />
            </div>
            <div className="text-[16px] font-bold text-[var(--erp-text)] leading-none" style={{ fontFamily: 'var(--font-display)' }}>
              {item.value.toLocaleString()}
            </div>
            <div className="text-[8px] uppercase tracking-wide text-[var(--erp-text-muted)]">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
