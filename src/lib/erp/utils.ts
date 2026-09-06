// FMCore ERP — Shared utilities
import type { ColumnDef, ColumnType } from './types';

// ---------- Document Numbering ----------
const PREFIX_MAP: Record<string, string> = {
  meetings: 'MTG',
  attendance: 'ATT',
  toolbox: 'TT',
  workorders: 'WO',
  pm: 'PM',
  cm: 'CM',
  gen_log: 'GEN',
  chiller_log: 'CHL',
  elec_insp: 'EI',
  safety_insp: 'SI',
  risk_assess: 'RA',
  ptw: 'PTW',
  incidents: 'IR',
  accident: 'AI',
  fire_equip: 'FEI',
  assets: 'AST',
  equipment: 'EQP',
  buildings: 'BLD',
  calibration: 'CAL',
  vendors: 'VND',
  contracts: 'CON',
  mat_req: 'MR',
  pur_req: 'PR',
  inventory: 'INV',
  siv: 'SIV',
  visitors: 'VST',
  leave: 'LR',
  training: 'TR',
  housekeeping: 'HI',
  kpi: 'KPI',
};

export function formatDocNumber(code: string, sequence: number): string {
  const prefix = PREFIX_MAP[code] || code.slice(0, 3).toUpperCase();
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

// ---------- Currency ----------
export function formatCurrency(value: number | string | undefined, currency = 'AED'): string {
  if (value === undefined || value === null || value === '') return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';
  const symbol = currency === 'AED' ? 'د.إ' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;
  return `${symbol} ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Compact currency display (e.g. "AED 1.2M") — used in dashboard, reports
export function formatCurrencyCompact(n: number, currency = 'AED'): string {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${currency} ${(n / 1_000).toFixed(1)}K`;
  return `${currency} ${n.toLocaleString()}`;
}

// Backwards-compatible alias used in register-view and reports-view
export const formatCurrencyDisplay = (n: number) => formatCurrencyCompact(n, 'AED');

export function formatNumber(value: number | string | undefined, decimals = 0): string {
  if (value === undefined || value === null || value === '') return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercent(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';
  return `${n}%`;
}

// ---------- Dates ----------
export function formatDate(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTimeAgo(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 0) return 'just now'; // future date
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d.toISOString());
}

// ---------- Status / Priority colors ----------
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

export function statusVariant(status: string | undefined): BadgeVariant {
  if (!status) return 'neutral';
  const s = status.toLowerCase();
  if (['open', 'draft', 'submitted', 'pending', 'scheduled', 'reported', 'due', 'under review', 'on track', 'at risk'].includes(s)) return 'warning';
  if (['in progress', 'active', 'approved', 'issued', 'on order', 'in stock', 'operational', 'compliant', 'calibrated', 'pass', 'achieved', 'exceeded', 'present', 'completed', 'paid'].includes(s)) return 'success';
  if (['overdue', 'critical', 'rejected', 'cancelled', 'fail', 'non-compliant', 'expired', 'out of service', 'beyond repair', 'terminated', 'blacklisted', 'suspended', 'absent'].includes(s)) return 'danger';
  if (['closed', 'inactive', 'completed', 'decommissioned', 'disposed', 'written off', 'standby', 'conditional pass', 'needs improvement', 'half day', 'late', 'on leave', 'behind'].includes(s)) return 'info';
  return 'neutral';
}

export function priorityVariant(priority: string | undefined): BadgeVariant {
  if (!priority) return 'neutral';
  const p = priority.toLowerCase();
  if (p === 'critical' || p === 'high') return 'danger';
  if (p === 'medium') return 'warning';
  if (p === 'low') return 'info';
  return 'neutral';
}

// ---------- Cell value formatting per column type ----------
export function formatCell(value: any, col: ColumnDef): string {
  if (value === undefined || value === null || value === '') return '—';
  switch (col.type) {
    case 'currency': return formatCurrency(value);
    case 'percentage': return formatPercent(value);
    case 'number': return formatNumber(value);
    case 'date': return formatDate(value);
    case 'datetime': return formatDateTime(value);
    case 'multi_select': return Array.isArray(value) ? value.join(', ') : String(value);
    case 'rating': return `${'★'.repeat(Number(value) || 0)}${'☆'.repeat(5 - (Number(value) || 0))}`;
    case 'auto_increment': return formatDocNumber(col.name.includes('No') ? '' : '', Number(value) || 0);
    default: return String(value);
  }
}

// ---------- ID generation (client-side, for tab IDs etc.) ----------
export function genId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Validation ----------
export function validateRecord(
  data: Record<string, any>,
  columns: ColumnDef[],
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  columns.forEach((col) => {
    if (col.required) {
      const v = data[col.name];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        errors[col.name] = `${col.name} is required`;
      }
    }
    if (col.type === 'email' && data[col.name]) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data[col.name]))) {
        errors[col.name] = 'Invalid email format';
      }
    }
    if (col.type === 'number' && data[col.name] !== '' && data[col.name] !== undefined) {
      if (isNaN(Number(data[col.name]))) {
        errors[col.name] = 'Must be a number';
      }
    }
    if (col.type === 'currency' && data[col.name] !== '' && data[col.name] !== undefined) {
      if (isNaN(Number(data[col.name]))) {
        errors[col.name] = 'Must be a valid amount';
      }
    }
  });
  return { valid: Object.keys(errors).length === 0, errors };
}

// ---------- Default value for a column ----------
export function defaultValue(col: ColumnDef): any {
  if (col.default !== undefined) return col.default;
  switch (col.type) {
    case 'auto_increment': return undefined; // server will assign
    case 'multi_select': return [];
    case 'number':
    case 'currency':
    case 'percentage':
    case 'rating': return 0;
    case 'date': return new Date().toISOString().slice(0, 10);
    case 'time': return new Date().toTimeString().slice(0, 5);
    default: return '';
  }
}
