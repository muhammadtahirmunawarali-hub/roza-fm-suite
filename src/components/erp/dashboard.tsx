'use client';

// FMCore ERP — Dashboard (with clickable KPIs, quick actions, recent records, custom widgets)
import { useEffect, useState, useMemo } from 'react';
import { dashboardApi, dashboardPrefsApi, registersApi, type DashboardPrefs } from '@/lib/erp/api';
import type { DashboardData, Register } from '@/lib/erp/types';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { Sparkline } from './sparkline';
import { DashboardCustomize } from './dashboard-customize';
import { SystemOverviewWidget } from './system-overview-widget';
import { RecentRecordsWidget } from './recent-records-widget';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/erp/utils';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Activity, Calendar, AlertTriangle,
  Plus, ArrowRight, Zap, FileText, Wrench, ShoppingCart, UserPlus, FileBarChart,
  Settings2, Pin,
} from 'lucide-react';

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [prefs, setPrefs] = useState<DashboardPrefs>({
    pinnedKpis: [], hiddenKpis: [], kpiOrder: [],
    pinnedCharts: [], hiddenCharts: [], chartOrder: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { openTab, setBuilderOpen, currency } = useErpStore();

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, regs, p] = await Promise.all([
        dashboardApi.get(),
        registersApi.list(),
        dashboardPrefsApi.get(),
      ]);
      setData(d);
      setRegisters(regs);
      setPrefs(p);
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openRegisterByCode = (code: string) => {
    const reg = registers.find((r) => r.code === code);
    if (reg) {
      openTab({ id: `reg_${reg.id}`, type: 'register', label: reg.name, icon: reg.icon, refId: reg.id });
    }
  };

  // Apply preferences: filter + sort KPIs
  const visibleKpis = useMemo(() => {
    if (!data) return [];
    const filtered = data.kpis.filter((k) => !prefs.hiddenKpis.includes(k.id));
    // Sort: pinned first, then by original order
    const pinned = filtered.filter((k) => prefs.pinnedKpis.includes(k.id));
    const unpinned = filtered.filter((k) => !prefs.pinnedKpis.includes(k.id));
    return [...pinned, ...unpinned];
  }, [data, prefs]);

  // Apply preferences: filter charts
  const visibleCharts = useMemo(() => {
    if (!data) return [];
    return data.charts.filter((c) => !prefs.hiddenCharts.includes(c.id));
  }, [data, prefs]);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center text-center">
        <div>
          <AlertTriangle className="w-10 h-10 text-[var(--erp-danger)] mx-auto mb-2" />
          <p className="text-[var(--erp-text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  // Top 3 quick action targets
  const quickActions = [
    { code: 'workorders', label: 'New Work Order', icon: 'fa-wrench', color: '#F59E0B' },
    { code: 'pur_req', label: 'New Purchase Request', icon: 'fa-cart-shopping', color: '#10B981' },
    { code: 'incidents', label: 'Report Incident', icon: 'fa-burst', color: '#EF4444' },
    { code: 'ptw', label: 'Issue Permit', icon: 'fa-file-signature', color: '#EF4444' },
    { code: 'vendors', label: 'Add Vendor', icon: 'fa-truck-field', color: '#10B981' },
    { code: 'visitors', label: 'Log Visitor', icon: 'fa-id-card', color: '#EC4899' },
  ].filter((qa) => registers.some((r) => r.code === qa.code));

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--erp-text)]" style={{ fontFamily: 'var(--font-display)' }}>
            Dashboard
          </h1>
          <p className="text-[12px] text-[var(--erp-text-muted)] mt-0.5">
            Real-time overview of your facility management operations
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--erp-text-muted)]">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)]">
            <Activity className="w-3 h-3" /> Updated {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)] hover:border-[var(--erp-accent-border)] hover:bg-[var(--erp-accent-dim)] hover:text-[var(--erp-accent)] transition-all"
            title="Customize dashboard"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Customize</span>
            {(prefs.hiddenKpis.length > 0 || prefs.hiddenCharts.length > 0 || prefs.pinnedKpis.length > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--erp-accent)]" />
            )}
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      {visibleKpis.length === 0 ? (
        <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg p-8 text-center">
          <Settings2 className="w-10 h-10 text-[var(--erp-text-muted)] mx-auto mb-2" />
          <h3 className="text-[14px] font-semibold text-[var(--erp-text)] mb-1">All KPIs are hidden</h3>
          <p className="text-[12px] text-[var(--erp-text-muted)] mb-3">
            You've hidden all KPI cards. Click "Customize" to show some.
          </p>
          <button
            onClick={() => setCustomizeOpen(true)}
            className="text-[12px] text-[var(--erp-accent)] hover:underline"
          >
            Open Customize
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {visibleKpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              isPinned={prefs.pinnedKpis.includes(kpi.id)}
              onClick={() => {
                if (kpi.link) {
                  const code = kpi.link.match(/tab=([^&]+)/)?.[1];
                  if (code) openRegisterByCode(code);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Quick Actions strip */}
      <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-[12px] text-[var(--erp-text)] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[var(--erp-accent)]" /> Quick Actions
          </h3>
          <button
            onClick={() => setBuilderOpen(true)}
            className="text-[11px] text-[var(--erp-accent)] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> New Register
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickActions.map((qa) => (
            <button
              key={qa.code}
              onClick={() => openRegisterByCode(qa.code)}
              className="group flex items-center gap-2 p-2.5 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)] hover:border-[var(--erp-accent-border)] hover:bg-[var(--erp-accent-dim)] transition-all"
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                style={{ background: qa.color + '20', color: qa.color }}
              >
                <FAIcon name={qa.icon} className="text-[11px]" />
              </div>
              <span className="text-[11px] text-[var(--erp-text-secondary)] group-hover:text-[var(--erp-text)] truncate">{qa.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* System Overview Widget */}
      <SystemOverviewWidget />

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!prefs.hiddenCharts.includes('by-category') && (
          <ChartCard title="Records by Category" subtitle="Distribution across ERP modules">
            <BarChart data={data.charts.find((c) => c.id === 'by-category')?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--erp-bg-hover)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={600}>
                {(data.charts.find((c) => c.id === 'by-category')?.data || []).map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        )}

        {!prefs.hiddenCharts.includes('wo-status') && (
          <ChartCard title="Work Orders by Status" subtitle="Current maintenance workload">
            <DoughnutChart data={data.charts.find((c) => c.id === 'wo-status')?.data || []} />
          </ChartCard>
        )}
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {!prefs.hiddenCharts.includes('top-registers') && (
          <ChartCard title="Records per Register" subtitle="Top 8 registers by record count" className="lg:col-span-2">
            <BarChart data={data.charts.find((c) => c.id === 'top-registers')?.data || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fill: 'var(--erp-text-secondary)', fontSize: 11 }} width={120} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--erp-bg-hover)' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={600}>
                {(data.charts.find((c) => c.id === 'top-registers')?.data || []).map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        )}

        {!prefs.hiddenCharts.includes('inv-status') && (
          <ChartCard title="Inventory Status" subtitle="Stock level distribution">
            <DoughnutChart data={data.charts.find((c) => c.id === 'inv-status')?.data || []} />
          </ChartCard>
        )}
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!prefs.hiddenCharts.includes('incident-severity') && (
          <ChartCard title="Incidents by Severity" subtitle="Safety incident breakdown">
            <BarChart data={data.charts.find((c) => c.id === 'incident-severity')?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--erp-bg-hover)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={600}>
                {(data.charts.find((c) => c.id === 'incident-severity')?.data || []).map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        )}

        {!prefs.hiddenCharts.includes('asset-cat') && (
          <ChartCard title="Asset Value by Category" subtitle={`Capital distribution (${currency})`}>
            <BarChart data={data.charts.find((c) => c.id === 'asset-cat')?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--erp-text-muted)', fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${currency} ${Number(v).toLocaleString()}`} cursor={{ fill: 'var(--erp-bg-hover)' }} />
              <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} animationDuration={600} />
            </BarChart>
          </ChartCard>
        )}
      </div>

      {/* 7-day activity timeline */}
      {data.activityByDay && data.activityByDay.length > 0 && (
        <ChartCard title="Activity Timeline (7 days)" subtitle="Created vs Updated vs Deleted records per day">
          <BarChart data={data.activityByDay.map((d) => ({ ...d, label: d.date.slice(5) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--erp-text-muted)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--erp-bg-hover)' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="created" stackId="a" fill="var(--erp-success)" name="Created" radius={[0, 0, 0, 0]} animationDuration={600} />
            <Bar dataKey="updated" stackId="a" fill="var(--erp-info)" name="Updated" animationDuration={600} />
            <Bar dataKey="deleted" stackId="a" fill="var(--erp-danger)" name="Deleted" radius={[4, 4, 0, 0]} animationDuration={600} />
          </BarChart>
        </ChartCard>
      )}

      {/* Recent Records + Recent activity + Upcoming items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentRecordsWidget />
        <Panel
          title="Recent Activity"
          icon={<Activity className="w-4 h-4 text-[var(--erp-accent)]" />}
          count={data.recentActivity.length}
          onViewAll={() => openTab({ id: 'audit', type: 'audit', label: 'Audit Logs', icon: 'fa-list-ul' })}
        >
          {data.recentActivity.length === 0 ? (
            <EmptyPanel text="No recent activity" />
          ) : (
            data.recentActivity.map((log) => (
              <div key={log.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-[var(--erp-bg-hover)] transition-colors">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
                  style={{
                    background: actionColor(log.action) + '20',
                    color: actionColor(log.action),
                  }}
                >
                  {log.action[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[var(--erp-text)] truncate">{log.summary}</div>
                  <div className="text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium">{log.userName || 'System'}</span>
                    <span>·</span>
                    <span>{log.module}</span>
                    <span>·</span>
                    <span>{formatTimeAgo(log.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </Panel>

        <Panel
          title="Upcoming & Overdue"
          icon={<Calendar className="w-4 h-4 text-[var(--erp-accent)]" />}
          count={data.upcomingItems.length}
        >
          {data.upcomingItems.length === 0 ? (
            <EmptyPanel text="No upcoming items" />
          ) : (
            data.upcomingItems.map((item, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-[var(--erp-bg-hover)] transition-colors">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{
                    background: item.severity === 'critical' ? 'var(--erp-danger)' : item.severity === 'warning' ? 'var(--erp-warning)' : 'var(--erp-info)',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[var(--erp-text)] truncate">{item.label}</div>
                  <div className="text-[10px] text-[var(--erp-text-muted)] mt-0.5">
                    {item.register} · due {item.date}
                  </div>
                </div>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                  style={{
                    background: item.severity === 'critical' ? 'rgba(239,68,68,0.15)' : item.severity === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(6,182,212,0.15)',
                    color: item.severity === 'critical' ? 'var(--erp-danger)' : item.severity === 'warning' ? 'var(--erp-warning)' : 'var(--erp-info)',
                  }}
                >
                  {item.severity}
                </span>
              </div>
            ))
          )}
        </Panel>
      </div>

      {/* Customize modal */}
      <DashboardCustomize
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        onSaved={() => loadAll()}
      />
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--erp-bg-elevated)',
  border: '1px solid var(--erp-border)',
  borderRadius: '8px',
  color: 'var(--erp-text)',
  fontSize: '12px',
};

function KpiCard({ kpi, onClick, isPinned }: { kpi: DashboardData['kpis'][number]; onClick?: () => void; isPinned?: boolean }) {
  const clickable = !!onClick || !!kpi.link;
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        'group relative bg-[var(--erp-bg-card)] border rounded-lg p-3 text-left transition-all',
        clickable ? 'hover:shadow-md hover:border-[var(--erp-accent-border)] hover:-translate-y-0.5 cursor-pointer' : 'cursor-default',
        isPinned ? 'border-[var(--erp-accent-border)] bg-[var(--erp-accent-dim)]/30' : 'border-[var(--erp-border)]',
      )}
    >
      {isPinned && (
        <Pin className="absolute top-1.5 right-1.5 w-2.5 h-2.5 text-[var(--erp-accent)] fill-[var(--erp-accent)]" />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-[var(--erp-text-muted)] uppercase tracking-wide truncate">
            {kpi.label}
          </div>
          <div className="text-[20px] font-bold text-[var(--erp-text)] mt-1 leading-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>
            {kpi.value}
          </div>
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
          style={{ background: kpi.color + '20', color: kpi.color }}
        >
          <FAIcon name={kpi.icon} className="text-[14px]" />
        </div>
      </div>
      {/* Sparkline + delta row */}
      {(kpi.sparkline || kpi.delta) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {kpi.sparkline && kpi.sparkline.length >= 2 && (
            <Sparkline data={kpi.sparkline} color={kpi.color} width={70} height={20} />
          )}
          {kpi.delta && (
            <span
              className={cn(
                'ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                kpi.deltaType === 'up' && 'bg-[rgba(16,185,129,0.15)] text-[var(--erp-success)]',
                kpi.deltaType === 'down' && 'bg-[rgba(239,68,68,0.15)] text-[var(--erp-danger)]',
                kpi.deltaType === 'flat' && 'bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)]',
              )}
            >
              {kpi.deltaType === 'up' && <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" />}
              {kpi.deltaType === 'down' && <TrendingDown className="w-2.5 h-2.5 inline mr-0.5" />}
              {kpi.delta}
            </span>
          )}
        </div>
      )}
      {clickable && (
        <div className="mt-1.5 text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </button>
  );
}

function Panel({
  title, icon, count, onViewAll, children,
}: { title: string; icon: React.ReactNode; count: number; onViewAll?: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
        <h3 className="font-semibold text-[13px] text-[var(--erp-text)] flex items-center gap-2">
          {icon} {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--erp-text-muted)]">{count} item{count === 1 ? '' : 's'}</span>
          {onViewAll && (
            <button onClick={onViewAll} className="text-[10px] text-[var(--erp-accent)] hover:underline">
              View all →
            </button>
          )}
        </div>
      </div>
      <div className="divide-y divide-[var(--erp-border)] max-h-[360px] overflow-y-auto flex-1">
        {children}
      </div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="p-6 text-center text-[var(--erp-text-muted)] text-[12px]">{text}</div>;
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg p-4', className)}>
      <div className="mb-3">
        <h3 className="font-semibold text-[13px] text-[var(--erp-text)]">{title}</h3>
        {subtitle && <p className="text-[10px] text-[var(--erp-text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        {children as any}
      </ResponsiveContainer>
    </div>
  );
}

function DoughnutChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  if (!data || data.length === 0) {
    return <div className="h-[240px] flex items-center justify-center text-[var(--erp-text-muted)] text-[12px]">No data</div>;
  }
  return (
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="label"
        cx="50%"
        cy="50%"
        innerRadius={55}
        outerRadius={85}
        paddingAngle={2}
        animationDuration={600}
      >
        {data.map((d, i) => (
          <Cell key={i} fill={d.color || '#94A3B8'} />
        ))}
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
    </PieChart>
  );
}

function actionColor(action: string): string {
  switch (action) {
    case 'Created': return 'var(--erp-success)';
    case 'Updated': return 'var(--erp-info)';
    case 'Deleted': return 'var(--erp-danger)';
    case 'Approved': return 'var(--erp-accent)';
    case 'Imported': return 'var(--erp-accent)';
    default: return 'var(--erp-text-muted)';
  }
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="h-8 w-48 bg-[var(--erp-bg-hover)] rounded animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-[84px] bg-[var(--erp-bg-hover)] rounded-lg animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <div className="h-[60px] bg-[var(--erp-bg-hover)] rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[300px] bg-[var(--erp-bg-hover)] rounded-lg animate-pulse" />
        <div className="h-[300px] bg-[var(--erp-bg-hover)] rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
