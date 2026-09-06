'use client';

// FMCore ERP — Dashboard Customize Modal
// Lets users pin/hide KPIs and charts, and reorder them.
import { useEffect, useState } from 'react';
import { dashboardApi, dashboardPrefsApi, type DashboardPrefs } from '@/lib/erp/api';
import type { DashboardData, DashboardKPI, DashboardChart } from '@/lib/erp/types';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Pin, PinOff, Eye, EyeOff, Check, X, Loader2, ArrowUp, ArrowDown,
  LayoutDashboard, Gauge, BarChart3, RefreshCw,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function DashboardCustomize({ open, onClose, onSaved }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [prefs, setPrefs] = useState<DashboardPrefs>({
    pinnedKpis: [], hiddenKpis: [], kpiOrder: [],
    pinnedCharts: [], hiddenCharts: [], chartOrder: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      dashboardApi.get(),
      dashboardPrefsApi.get(),
    ]).then(([d, p]) => {
      if (cancelled) return;
      setData(d);
      setPrefs(p);
    }).catch((e) => {
      console.error('Failed to load dashboard data', e);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  const toggleKpi = (kpiId: string) => {
    setPrefs((p) => {
      const hidden = p.hiddenKpis.includes(kpiId)
        ? p.hiddenKpis.filter((id) => id !== kpiId)
        : [...p.hiddenKpis, kpiId];
      return { ...p, hiddenKpis: hidden };
    });
  };

  const togglePinKpi = (kpiId: string) => {
    setPrefs((p) => {
      const pinned = p.pinnedKpis.includes(kpiId)
        ? p.pinnedKpis.filter((id) => id !== kpiId)
        : [...p.pinnedKpis, kpiId];
      return { ...p, pinnedKpis: pinned };
    });
  };

  const toggleChart = (chartId: string) => {
    setPrefs((p) => {
      const hidden = p.hiddenCharts.includes(chartId)
        ? p.hiddenCharts.filter((id) => id !== chartId)
        : [...p.hiddenCharts, chartId];
      return { ...p, hiddenCharts: hidden };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dashboardPrefsApi.save(prefs);
      toast.success('Dashboard preferences saved');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error('Failed to save preferences', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrefs({
      pinnedKpis: [], hiddenKpis: [], kpiOrder: [],
      pinnedCharts: [], hiddenCharts: [], chartOrder: [],
    });
    toast.info('Preferences reset to defaults (click Save to apply)');
  };

  const visibleKpis = data?.kpis.filter((k) => !prefs.hiddenKpis.includes(k.id)) || [];
  const hiddenKpis = data?.kpis.filter((k) => prefs.hiddenKpis.includes(k.id)) || [];
  const visibleCharts = data?.charts.filter((c) => !prefs.hiddenCharts.includes(c.id)) || [];
  const hiddenCharts = data?.charts.filter((c) => prefs.hiddenCharts.includes(c.id)) || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-[var(--erp-accent)]" />
            Customize Dashboard
          </DialogTitle>
          <p className="text-[11px] text-[var(--erp-text-muted)] -mt-1">
            Pin important KPIs to the top, hide ones you don't need, and toggle charts on/off.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[var(--erp-accent)] animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-5">
            {/* KPIs section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-3.5 h-3.5 text-[var(--erp-accent)]" />
                <h3 className="text-[12px] font-semibold text-[var(--erp-text)] uppercase tracking-wide">KPI Cards ({data?.kpis.length || 0})</h3>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {data?.kpis.map((kpi) => {
                  const isHidden = prefs.hiddenKpis.includes(kpi.id);
                  const isPinned = prefs.pinnedKpis.includes(kpi.id);
                  return (
                    <div
                      key={kpi.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border transition-all',
                        isHidden
                          ? 'border-[var(--erp-border)] bg-[var(--erp-bg)] opacity-50'
                          : 'border-[var(--erp-border)] bg-[var(--erp-bg-card)] hover:border-[var(--erp-accent-border)]',
                      )}
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: kpi.color + '20', color: kpi.color }}
                      >
                        <FAIcon name={kpi.icon} className="text-[11px]" />
                      </div>
                      <span className="text-[11px] font-medium text-[var(--erp-text)] flex-1 truncate">{kpi.label}</span>
                      <button
                        onClick={() => togglePinKpi(kpi.id)}
                        className={cn(
                          'p-1 rounded transition-colors',
                          isPinned
                            ? 'text-[var(--erp-accent)] bg-[var(--erp-accent-dim)]'
                            : 'text-[var(--erp-text-muted)] hover:text-[var(--erp-accent)] hover:bg-[var(--erp-bg-hover)]',
                        )}
                        title={isPinned ? 'Unpin' : 'Pin to top'}
                        aria-label={isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin className="w-3 h-3" fill={isPinned ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => toggleKpi(kpi.id)}
                        className={cn(
                          'p-1 rounded transition-colors',
                          isHidden
                            ? 'text-[var(--erp-text-muted)] hover:text-[var(--erp-success)]'
                            : 'text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)]',
                        )}
                        title={isHidden ? 'Show' : 'Hide'}
                        aria-label={isHidden ? 'Show' : 'Hide'}
                      >
                        {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  );
                })}
              </div>
              {hiddenKpis.length > 0 && (
                <div className="mt-2 text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  {hiddenKpis.length} KPI{hiddenKpis.length === 1 ? '' : 's'} hidden
                </div>
              )}
            </div>

            {/* Charts section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-[var(--erp-accent)]" />
                <h3 className="text-[12px] font-semibold text-[var(--erp-text)] uppercase tracking-wide">Charts ({data?.charts.length || 0})</h3>
              </div>
              <div className="space-y-1.5">
                {data?.charts.map((chart) => {
                  const isHidden = prefs.hiddenCharts.includes(chart.id);
                  return (
                    <div
                      key={chart.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border transition-all',
                        isHidden
                          ? 'border-[var(--erp-border)] bg-[var(--erp-bg)] opacity-50'
                          : 'border-[var(--erp-border)] bg-[var(--erp-bg-card)] hover:border-[var(--erp-accent-border)]',
                      )}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[var(--erp-text-muted)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-[var(--erp-text)] truncate">{chart.title}</div>
                        <div className="text-[9px] text-[var(--erp-text-muted)] capitalize">{chart.type} chart · {chart.data.length} data points</div>
                      </div>
                      <button
                        onClick={() => toggleChart(chart.id)}
                        className={cn(
                          'p-1 rounded transition-colors',
                          isHidden
                            ? 'text-[var(--erp-text-muted)] hover:text-[var(--erp-success)]'
                            : 'text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)]',
                        )}
                        title={isHidden ? 'Show' : 'Hide'}
                        aria-label={isHidden ? 'Show' : 'Hide'}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
              {hiddenCharts.length > 0 && (
                <div className="mt-2 text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  {hiddenCharts.length} chart{hiddenCharts.length === 1 ? '' : 's'} hidden
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-[var(--erp-border)] pt-3">
          <Button variant="outline" onClick={handleReset} disabled={saving || loading} className="text-[12px] h-9">
            <RefreshCw className="w-4 h-4 mr-1" /> Reset
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving} className="text-[12px] h-9">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="text-[12px] h-9 bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
