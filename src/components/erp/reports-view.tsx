'use client';

// FMCore ERP — Reports view
// Generates dynamic reports from register data.
import { useEffect, useMemo, useState } from 'react';
import { registersApi } from '@/lib/erp/api';
import type { Register, ColumnDef } from '@/lib/erp/types';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { formatCurrencyDisplay } from '@/lib/erp/utils';
import { Download, FileBarChart, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDate } from '@/lib/erp/utils';

type ReportType = 'summary' | 'group-by' | 'pivot-value';

export function ReportsView() {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [selectedReg, setSelectedReg] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [groupBy, setGroupBy] = useState<string>('');
  const [valueCol, setValueCol] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    registersApi.list().then((r) => {
      setRegisters(r);
      if (r.length > 0) setSelectedReg(r[0].id);
    }).catch(() => {});
  }, []);

  const currentReg = registers.find((r) => r.id === selectedReg);

  // Auto-pick sensible group-by and value columns when register changes
  useEffect(() => {
    if (!currentReg) return;
    const statusCol = currentReg.columns.find((c) => c.type === 'status' || c.type === 'priority' || c.type === 'dropdown');
    const numCol = currentReg.columns.find((c) => c.type === 'currency' || c.type === 'number');
    setGroupBy(statusCol?.name || currentReg.columns[0]?.name || '');
    setValueCol(numCol?.name || '');
  }, [currentReg]);

  const runReport = async () => {
    if (!currentReg) return;
    setLoading(true);
    try {
      // Fetch all records (pageSize large)
      const res = await fetch(`/api/erp/registers/${currentReg.id}/records?pageSize=500`);
      const data = await res.json();
      const records = data.data || [];

      if (reportType === 'summary') {
        const summary = computeSummary(currentReg, records);
        setResult({ type: 'summary', data: summary, total: records.length });
      } else if (reportType === 'group-by') {
        const grouped = groupByField(currentReg, records, groupBy);
        setResult({ type: 'group-by', data: grouped, total: records.length, groupBy, valueCol });
      } else if (reportType === 'pivot-value') {
        const pivot = pivotByValue(currentReg, records, groupBy, valueCol);
        setResult({ type: 'pivot-value', data: pivot, total: records.length, groupBy, valueCol });
      }
    } catch (e: any) {
      toast.error('Report failed', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    let csv = '';
    if (result.type === 'summary') {
      csv = ['Metric,Value', ...result.data.map((r: any) => `${r.label},${r.value}`)].join('\n');
    } else if (result.type === 'group-by') {
      csv = [`${result.groupBy},Count${result.valueCol ? `,Sum of ${result.valueCol}` : ''}`, ...result.data.map((r: any) => `${r.label},${r.count}${r.sum ? `,${r.sum}` : ''}`)].join('\n');
    } else if (result.type === 'pivot-value') {
      csv = [`${result.groupBy},Count,Sum of ${result.valueCol},Average,Min,Max`, ...result.data.map((r: any) => `${r.label},${r.count},${r.sum},${r.avg?.toFixed(2) || 0},${r.min},${r.max}`)].join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReg?.code}_${result.type}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--erp-text)]" style={{ fontFamily: 'var(--font-display)' }}>
          Reports
        </h1>
        <p className="text-[12px] text-[var(--erp-text-muted)] mt-0.5">
          Generate dynamic reports from your register data. All calculations are computed from live records.
        </p>
      </div>

      {/* Report config */}
      <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-[11px] mb-1">Register</Label>
            <Select value={selectedReg} onValueChange={setSelectedReg}>
              <SelectTrigger className="h-9 text-[12px] bg-[var(--erp-bg-input)]">
                <SelectValue placeholder="Select register..." />
              </SelectTrigger>
              <SelectContent>
                {registers.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-[12px]">
                    <span className="flex items-center gap-1.5">
                      <FAIcon name={r.icon} style={{ color: r.color }} />
                      {r.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] mb-1">Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="h-9 text-[12px] bg-[var(--erp-bg-input)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary" className="text-[12px]">Summary statistics</SelectItem>
                <SelectItem value="group-by" className="text-[12px]">Group by field (count)</SelectItem>
                <SelectItem value="pivot-value" className="text-[12px]">Pivot by field + value column</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(reportType === 'group-by' || reportType === 'pivot-value') && (
            <div>
              <Label className="text-[11px] mb-1">Group By</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="h-9 text-[12px] bg-[var(--erp-bg-input)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentReg?.columns.map((c) => (
                    <SelectItem key={c.name} value={c.name} className="text-[12px]">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {reportType === 'pivot-value' && (
            <div>
              <Label className="text-[11px] mb-1">Value Column</Label>
              <Select value={valueCol} onValueChange={setValueCol}>
                <SelectTrigger className="h-9 text-[12px] bg-[var(--erp-bg-input)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentReg?.columns.filter((c) => ['number', 'currency', 'percentage', 'rating'].includes(c.type)).map((c) => (
                    <SelectItem key={c.name} value={c.name} className="text-[12px]">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button onClick={runReport} disabled={loading || !currentReg} className="h-9 text-[12px] bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
            <FileBarChart className="w-4 h-4 mr-1" /> {loading ? 'Running...' : 'Run Report'}
          </Button>
          {result && (
            <Button onClick={exportCsv} variant="outline" className="h-9 text-[12px]">
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Report result */}
      {result && (
        <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[var(--erp-text)]">
              {currentReg?.name} — {result.type === 'summary' ? 'Summary' : result.type === 'group-by' ? `Grouped by ${result.groupBy}` : `Pivot: ${result.groupBy} × ${result.valueCol}`}
            </h3>
            <span className="text-[11px] text-[var(--erp-text-muted)]">{result.total} records analyzed</span>
          </div>

          {result.type === 'summary' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
              {result.data.map((m: any, i: number) => (
                <div key={i} className="border border-[var(--erp-border)] rounded-md p-3">
                  <div className="text-[10px] uppercase text-[var(--erp-text-muted)] tracking-wide">{m.label}</div>
                  <div className="text-[16px] font-bold text-[var(--erp-text)] mt-1">{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {result.type === 'group-by' && (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[var(--erp-bg-elevated)] border-b border-[var(--erp-border)]">
                    <th className="px-4 py-2 text-left text-[11px] uppercase text-[var(--erp-text-secondary)]">{result.groupBy}</th>
                    <th className="px-4 py-2 text-right text-[11px] uppercase text-[var(--erp-text-secondary)]">Count</th>
                    <th className="px-4 py-2 text-right text-[11px] uppercase text-[var(--erp-text-secondary)]">%</th>
                    {result.valueCol && <th className="px-4 py-2 text-right text-[11px] uppercase text-[var(--erp-text-secondary)]">Sum of {result.valueCol}</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-[var(--erp-border)] hover:bg-[var(--erp-bg-hover)]">
                      <td className="px-4 py-2 text-[var(--erp-text)] font-medium">{row.label}</td>
                      <td className="px-4 py-2 text-right font-mono">{row.count}</td>
                      <td className="px-4 py-2 text-right text-[var(--erp-text-muted)]">{((row.count / result.total) * 100).toFixed(1)}%</td>
                      {result.valueCol && <td className="px-4 py-2 text-right font-mono">{row.sum ? formatCurrencyDisplay(row.sum) : '—'}</td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--erp-bg-elevated)] font-semibold border-t-2 border-[var(--erp-border)]">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right font-mono">{result.total}</td>
                    <td className="px-4 py-2 text-right">100%</td>
                    {result.valueCol && <td className="px-4 py-2 text-right font-mono">{formatCurrencyDisplay(result.data.reduce((s: number, r: any) => s + (r.sum || 0), 0))}</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {result.type === 'pivot-value' && (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[var(--erp-bg-elevated)] border-b border-[var(--erp-border)]">
                    <th className="px-4 py-2 text-left text-[11px] uppercase text-[var(--erp-text-secondary)]">{result.groupBy}</th>
                    <th className="px-4 py-2 text-right text-[11px] uppercase text-[var(--erp-text-secondary)]">Count</th>
                    <th className="px-4 py-2 text-right text-[11px] uppercase text-[var(--erp-text-secondary)]">Sum</th>
                    <th className="px-4 py-2 text-right text-[11px] uppercase text-[var(--erp-text-secondary)]">Average</th>
                    <th className="px-4 py-2 text-right text-[11px] uppercase text-[var(--erp-text-secondary)]">Min</th>
                    <th className="px-4 py-2 text-right text-[11px] uppercase text-[var(--erp-text-secondary)]">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-[var(--erp-border)] hover:bg-[var(--erp-bg-hover)]">
                      <td className="px-4 py-2 text-[var(--erp-text)] font-medium">{row.label}</td>
                      <td className="px-4 py-2 text-right font-mono">{row.count}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatCurrencyDisplay(row.sum)}</td>
                      <td className="px-4 py-2 text-right font-mono">{row.avg.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-mono">{row.min}</td>
                      <td className="px-4 py-2 text-right font-mono">{row.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function computeSummary(reg: Register, records: any[]) {
  const summary: { label: string; value: string | number }[] = [];
  summary.push({ label: 'Total Records', value: records.length });

  reg.columns.forEach((col) => {
    if (col.type === 'currency' || col.type === 'number') {
      const vals = records.map((r) => Number(r.data[col.name])).filter((v) => !isNaN(v));
      const sum = vals.reduce((s, v) => s + v, 0);
      const avg = vals.length ? sum / vals.length : 0;
      const min = vals.length ? Math.min(...vals) : 0;
      const max = vals.length ? Math.max(...vals) : 0;
      summary.push({ label: `Sum of ${col.name}`, value: col.type === 'currency' ? formatCurrencyDisplay(sum) : sum.toFixed(2) });
      summary.push({ label: `Avg ${col.name}`, value: col.type === 'currency' ? formatCurrencyDisplay(avg) : avg.toFixed(2) });
      summary.push({ label: `Min ${col.name}`, value: col.type === 'currency' ? formatCurrencyDisplay(min) : min });
      summary.push({ label: `Max ${col.name}`, value: col.type === 'currency' ? formatCurrencyDisplay(max) : max });
    } else if (col.type === 'status' || col.type === 'priority' || col.type === 'dropdown') {
      const counts: Record<string, number> = {};
      records.forEach((r) => {
        const v = r.data[col.name];
        if (v) counts[v] = (counts[v] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top) summary.push({ label: `Top ${col.name}`, value: `${top[0]} (${top[1]})` });
    }
  });
  return summary;
}

function groupByField(reg: Register, records: any[], field: string) {
  const groups: Record<string, { count: number; sum: number }> = {};
  const valCol = reg.columns.find((c) => c.type === 'currency' || c.type === 'number');
  records.forEach((r) => {
    const k = String(r.data[field] ?? '—');
    if (!groups[k]) groups[k] = { count: 0, sum: 0 };
    groups[k].count++;
    if (valCol) {
      const v = Number(r.data[valCol.name]);
      if (!isNaN(v)) groups[k].sum += v;
    }
  });
  return Object.entries(groups)
    .map(([label, v]) => ({ label, count: v.count, sum: v.sum }))
    .sort((a, b) => b.count - a.count);
}

function pivotByValue(reg: Register, records: any[], groupField: string, valueField: string) {
  const groups: Record<string, { values: number[] }> = {};
  records.forEach((r) => {
    const k = String(r.data[groupField] ?? '—');
    if (!groups[k]) groups[k] = { values: [] };
    const v = Number(r.data[valueField]);
    if (!isNaN(v)) groups[k].values.push(v);
  });
  return Object.entries(groups).map(([label, g]) => {
    const sum = g.values.reduce((s, v) => s + v, 0);
    const avg = g.values.length ? sum / g.values.length : 0;
    return {
      label,
      count: g.values.length,
      sum,
      avg,
      min: g.values.length ? Math.min(...g.values) : 0,
      max: g.values.length ? Math.max(...g.values) : 0,
    };
  }).sort((a, b) => b.count - a.count);
}
