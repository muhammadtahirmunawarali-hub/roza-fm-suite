'use client';

// FMCore ERP — Dashboard
import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/erp/api';
import type { DashboardData } from '@/lib/erp/types';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/erp/utils';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, Doughnut
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar, AlertTriangle } from 'lucide-react';

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await dashboardApi.get();
        if (!cancelled) setData(d);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Records by Category" subtitle="Distribution across ERP modules">
          <BarChart data={data.charts.find((c) => c.id === 'by-category')?.data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {(data.charts.find((c) => c.id === 'by-category')?.data || []).map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Work Orders by Status" subtitle="Current maintenance workload">
          <DoughnutChart data={data.charts.find((c) => c.id === 'wo-status')?.data || []} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Records per Register" subtitle="Top 8 registers by record count" className="lg:col-span-2">
          <BarChart data={data.charts.find((c) => c.id === 'top-registers')?.data || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={{ fill: 'var(--erp-text-secondary)', fontSize: 11 }} width={120} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {(data.charts.find((c) => c.id === 'top-registers')?.data || []).map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Inventory Status" subtitle="Stock level distribution">
          <DoughnutChart data={data.charts.find((c) => c.id === 'inv-status')?.data || []} />
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Incidents by Severity" subtitle="Safety incident breakdown">
          <BarChart data={data.charts.find((c) => c.id === 'incident-severity')?.data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {(data.charts.find((c) => c.id === 'incident-severity')?.data || []).map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Asset Value by Category" subtitle="Capital distribution (AED)">
          <BarChart data={data.charts.find((c) => c.id === 'asset-cat')?.data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--erp-border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--erp-text-muted)', fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fill: 'var(--erp-text-muted)', fontSize: 11 }} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `AED ${Number(v).toLocaleString()}`} />
            <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {/* Recent activity + Upcoming items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
            <h3 className="font-semibold text-[13px] text-[var(--erp-text)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--erp-accent)]" /> Recent Activity
            </h3>
            <span className="text-[10px] text-[var(--erp-text-muted)]">{data.recentActivity.length} events</span>
          </div>
          <div className="divide-y divide-[var(--erp-border)] max-h-[360px] overflow-y-auto">
            {data.recentActivity.length === 0 ? (
              <div className="p-6 text-center text-[var(--erp-text-muted)] text-[12px]">No recent activity</div>
            ) : (
              data.recentActivity.map((log) => (
                <div key={log.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-[var(--erp-bg-hover)]">
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
          </div>
        </div>

        <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
            <h3 className="font-semibold text-[13px] text-[var(--erp-text)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--erp-accent)]" /> Upcoming & Overdue
            </h3>
            <span className="text-[10px] text-[var(--erp-text-muted)]">{data.upcomingItems.length} items</span>
          </div>
          <div className="divide-y divide-[var(--erp-border)] max-h-[360px] overflow-y-auto">
            {data.upcomingItems.length === 0 ? (
              <div className="p-6 text-center text-[var(--erp-text-muted)] text-[12px]">No upcoming items</div>
            ) : (
              data.upcomingItems.map((item, i) => (
                <div key={i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-[var(--erp-bg-hover)]">
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
          </div>
        </div>
      </div>
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

function KpiCard({ kpi }: { kpi: DashboardData['kpis'][number] }) {
  return (
    <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg p-3 hover:shadow-md transition-shadow">
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
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: kpi.color + '20', color: kpi.color }}
        >
          <FAIcon name={kpi.icon} className="text-[14px]" />
        </div>
      </div>
    </div>
  );
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
          <div key={i} className="h-[84px] bg-[var(--erp-bg-hover)] rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[300px] bg-[var(--erp-bg-hover)] rounded-lg animate-pulse" />
        <div className="h-[300px] bg-[var(--erp-bg-hover)] rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
