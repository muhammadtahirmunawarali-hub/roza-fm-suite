// FMCore ERP — Dashboard API
// Computes KPIs + charts dynamically from register data (no hardcoded totals)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { seedDatabase } from '@/lib/erp/seed';
import { REGISTER_CATEGORIES } from '@/lib/erp/types';
import type { DashboardData, DashboardKPI, DashboardChart } from '@/lib/erp/types';
import { formatDocNumber } from '@/lib/erp/utils';

export async function GET() {
  await seedDatabase(false);

  const registers = await db.register.findMany({
    where: { isDeleted: false },
    include: { records: { where: { isDeleted: false } } },
  });

  const findReg = (code: string) => registers.find((r) => r.code === code);
  const parseColumns = (r: any) => JSON.parse(r.columns) as any[];
  const colIndex = (r: any) => {
    const cols = parseColumns(r);
    const map: Record<string, number> = {};
    cols.forEach((c, i) => { map[c.name] = i; map[c.name.toLowerCase()] = i; });
    return { cols, map };
  };
  const get = (rec: any, name: string, cols: any[]) => {
    const data = JSON.parse(rec.data);
    const direct = data[name];
    if (direct !== undefined) return direct;
    const found = Object.keys(data).find((k) => k.toLowerCase() === name.toLowerCase());
    return found ? data[found] : undefined;
  };

  // ---- KPIs ----
  const workorders = findReg('workorders');
  const woRecords = workorders?.records || [];
  const openWOs = woRecords.filter((r) => {
    const s = get(r, 'Status', []);
    return s === 'Open' || s === 'In Progress';
  }).length;
  const criticalWOs = woRecords.filter((r) => get(r, 'Priority', []) === 'Critical').length;

  const pm = findReg('pm');
  const pmRecords = pm?.records || [];
  const pmDue = pmRecords.filter((r) => {
    const s = get(r, 'Status', []);
    return s === 'Due' || s === 'Overdue';
  }).length;

  const inv = findReg('inventory');
  const invRecords = inv?.records || [];
  const lowStock = invRecords.filter((r) => {
    const s = get(r, 'Status', []);
    return s === 'Low Stock' || s === 'Out of Stock';
  }).length;
  const totalInvValue = invRecords.reduce((sum, r) => {
    const qty = Number(get(r, 'Qty In Stock', [])) || 0;
    // Approximate average unit value — uses Max Level as proxy if available
    return sum + qty;
  }, 0);

  const assets = findReg('assets');
  const assetRecords = assets?.records || [];
  const activeAssets = assetRecords.filter((r) => get(r, 'Status', []) === 'Active').length;
  const assetValue = assetRecords.reduce((sum, r) => sum + (Number(get(r, 'Value (AED)', [])) || 0), 0);

  const contracts = findReg('contracts');
  const contractRecords = contracts?.records || [];
  const activeContracts = contractRecords.filter((r) => get(r, 'Status', []) === 'Active').length;
  const contractValue = contractRecords.reduce((sum, r) => sum + (Number(get(r, 'Value (AED)', [])) || 0), 0);

  const incidents = findReg('incidents');
  const incidentRecords = incidents?.records || [];
  const openIncidents = incidentRecords.filter((r) => {
    const s = get(r, 'Status', []);
    return s !== 'Closed';
  }).length;

  const ptw = findReg('ptw');
  const ptwRecords = ptw?.records || [];
  const pendingPTW = ptwRecords.filter((r) => {
    const s = get(r, 'Status', []);
    return s === 'Submitted' || s === 'Draft';
  }).length;

  const vendors = findReg('vendors');
  const activeVendors = (vendors?.records || []).filter((r) => get(r, 'Status', []) === 'Active').length;

  const employees = new Set<string>();
  registers.forEach((r) => {
    const cols = parseColumns(r);
    const empCols = cols.filter((c) => c.type === 'employee').map((c) => c.name);
    r.records.forEach((rec) => {
      const data = JSON.parse(rec.data);
      empCols.forEach((col) => {
        const v = data[col];
        if (v) employees.add(String(v));
      });
    });
  });

  const totalRecords = registers.reduce((s, r) => s + r.records.length, 0);

  const kpis: DashboardKPI[] = [
    { id: 'open-wo',     label: 'Open Work Orders',  value: openWOs,         rawValue: openWOs, icon: 'fa-wrench',          color: '#F59E0B', link: '?tab=workorders' },
    { id: 'critical-wo', label: 'Critical Priority',  value: criticalWOs,     rawValue: criticalWOs, icon: 'fa-triangle-exclamation', color: '#EF4444', link: '?tab=workorders' },
    { id: 'pm-due',      label: 'PM Due / Overdue',   value: pmDue,           rawValue: pmDue, icon: 'fa-clock-rotate-left', color: '#F59E0B', link: '?tab=pm' },
    { id: 'low-stock',   label: 'Low Stock Items',    value: lowStock,        rawValue: lowStock, icon: 'fa-boxes-stacked',   color: '#10B981', link: '?tab=inventory' },
    { id: 'active-assets', label: 'Active Assets',    value: activeAssets,    rawValue: activeAssets, icon: 'fa-building', color: '#8B5CF6', link: '?tab=assets' },
    { id: 'asset-value', label: 'Asset Value',        value: formatAED(assetValue), icon: 'fa-coins', color: '#8B5CF6', link: '?tab=assets' },
    { id: 'active-contracts', label: 'Active Contracts', value: activeContracts, rawValue: activeContracts, icon: 'fa-file-contract', color: '#10B981', link: '?tab=contracts' },
    { id: 'contract-value', label: 'Contract Value',  value: formatAED(contractValue), icon: 'fa-file-invoice-dollar', color: '#10B981', link: '?tab=contracts' },
    { id: 'open-incidents', label: 'Open Incidents',  value: openIncidents,   rawValue: openIncidents, icon: 'fa-burst', color: '#EF4444', link: '?tab=incidents' },
    { id: 'pending-ptw', label: 'Pending PTW',         value: pendingPTW,      rawValue: pendingPTW, icon: 'fa-file-signature', color: '#EF4444', link: '?tab=ptw' },
    { id: 'active-vendors', label: 'Active Vendors',  value: activeVendors,   rawValue: activeVendors, icon: 'fa-truck-field', color: '#10B981', link: '?tab=vendors' },
    { id: 'employees',   label: 'People (Referenced)', value: employees.size,  rawValue: employees.size, icon: 'fa-users', color: '#3B82F6' },
    { id: 'total-records', label: 'Total Records',     value: totalRecords,    rawValue: totalRecords, icon: 'fa-database', color: '#06B6D4' },
    { id: 'registers',   label: 'Active Registers',   value: registers.length, rawValue: registers.length, icon: 'fa-table-list', color: '#64748B' },
  ];

  // ---- Charts ----
  const charts: DashboardChart[] = [];

  // 1. Records by Category (bar)
  const byCategory = Object.values(REGISTER_CATEGORIES).map((cat) => {
    const regs = registers.filter((r) => r.category === cat.id);
    const count = regs.reduce((s, r) => s + r.records.length, 0);
    return { label: cat.name.split(' ')[0], value: count, color: cat.color };
  }).filter((d) => d.value > 0);
  charts.push({ id: 'by-category', title: 'Records by Category', type: 'bar', data: byCategory });

  // 2. Work Orders by Status (doughnut)
  if (workorders) {
    const statusCol = parseColumns(workorders).find((c) => c.type === 'status');
    if (statusCol) {
      const counts: Record<string, number> = {};
      workorders.records.forEach((r) => {
        const s = get(r, statusCol.name, []) || 'Unknown';
        counts[s] = (counts[s] || 0) + 1;
      });
      const colorMap: Record<string, string> = { 'Open': '#EF4444', 'In Progress': '#F59E0B', 'Completed': '#10B981', 'On Hold': '#64748B', 'Cancelled': '#94A3B8' };
      charts.push({
        id: 'wo-status',
        title: 'Work Orders by Status',
        type: 'doughnut',
        data: Object.entries(counts).map(([label, value]) => ({ label, value, color: colorMap[label] || '#94A3B8' })),
      });
    }
  }

  // 3. Records per Register (top 8) — bar
  const topRegisters = registers
    .map((r) => ({ label: r.name.length > 18 ? r.name.slice(0, 16) + '…' : r.name, value: r.records.length, color: r.color }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  charts.push({ id: 'top-registers', title: 'Records per Register (Top 8)', type: 'bar', data: topRegisters });

  // 4. Inventory Status (pie)
  if (inv) {
    const statusCol = parseColumns(inv).find((c) => c.type === 'status');
    if (statusCol) {
      const counts: Record<string, number> = {};
      inv.records.forEach((r) => {
        const s = get(r, statusCol.name, []) || 'Unknown';
        counts[s] = (counts[s] || 0) + 1;
      });
      const colorMap: Record<string, string> = { 'In Stock': '#10B981', 'Low Stock': '#F59E0B', 'Out of Stock': '#EF4444', 'On Order': '#06B6D4', 'Expired': '#94A3B8' };
      charts.push({
        id: 'inv-status',
        title: 'Inventory Status',
        type: 'pie',
        data: Object.entries(counts).map(([label, value]) => ({ label, value, color: colorMap[label] || '#94A3B8' })),
      });
    }
  }

  // 5. Incidents by Severity (bar)
  if (incidents) {
    const sevCol = parseColumns(incidents).find((c) => c.type === 'priority');
    if (sevCol) {
      const counts: Record<string, number> = {};
      incidents.records.forEach((r) => {
        const s = get(r, sevCol.name, []) || 'Unknown';
        counts[s] = (counts[s] || 0) + 1;
      });
      const order = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];
      const colorMap: Record<string, string> = { 'Critical': '#EF4444', 'High': '#F59E0B', 'Medium': '#06B6D4', 'Low': '#10B981', 'Unknown': '#94A3B8' };
      charts.push({
        id: 'incident-severity',
        title: 'Incidents by Severity',
        type: 'bar',
        data: order.filter((k) => counts[k]).map((k) => ({ label: k, value: counts[k], color: colorMap[k] })),
      });
    }
  }

  // 6. Asset Value by Category (bar)
  if (assets) {
    const catCol = parseColumns(assets).find((c) => c.type === 'dropdown' && c.name.toLowerCase().includes('category'));
    const valCol = parseColumns(assets).find((c) => c.type === 'currency');
    if (catCol && valCol) {
      const totals: Record<string, number> = {};
      assets.records.forEach((r) => {
        const cat = get(r, catCol.name, []) || 'Other';
        const val = Number(get(r, valCol.name, [])) || 0;
        totals[cat] = (totals[cat] || 0) + val;
      });
      charts.push({
        id: 'asset-cat',
        title: 'Asset Value by Category (AED)',
        type: 'bar',
        data: Object.entries(totals).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      });
    }
  }

  // ---- Recent activity ----
  const recentLogs = await db.auditLog.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
  });
  const recentActivity = recentLogs.map((l) => ({
    id: l.id,
    userId: l.userId,
    userName: l.userId ? 'Admin' : 'System',
    action: l.action,
    module: l.module,
    registerId: l.registerId,
    recordId: l.recordId,
    summary: l.summary,
    oldValue: l.oldValue ? JSON.parse(l.oldValue) : null,
    newValue: l.newValue ? JSON.parse(l.newValue) : null,
    createdAt: l.createdAt.toISOString(),
  }));

  // ---- Upcoming items (PM due, PTW scheduled, expiring calibrations) ----
  const upcomingItems: DashboardData['upcomingItems'] = [];
  if (pm) {
    const nextDueCol = parseColumns(pm).find((c) => c.name.toLowerCase().includes('next due'));
    pm.records.forEach((r) => {
      const next = get(r, nextDueCol?.name || 'Next Due', []);
      if (next) {
        const eq = get(r, 'Equipment', []);
        const status = get(r, 'Status', []);
        upcomingItems.push({
          label: `PM: ${eq}`,
          date: next,
          register: 'Preventive Maintenance',
          severity: status === 'Overdue' ? 'critical' : 'warning',
        });
      }
    });
  }
  if (ptw) {
    const startCol = parseColumns(ptw).find((c) => c.name.toLowerCase().includes('start'));
    ptw.records.forEach((r) => {
      const start = get(r, startCol?.name || 'Start Date', []);
      const desc = get(r, 'Work Description', []);
      if (start) {
        upcomingItems.push({
          label: `PTW: ${String(desc).slice(0, 50)}`,
          date: String(start).split(' ')[0],
          register: 'Permit To Work',
          severity: 'info',
        });
      }
    });
  }
  upcomingItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const data: DashboardData = { kpis, charts, recentActivity, upcomingItems: upcomingItems.slice(0, 10) };
  return NextResponse.json(data);
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(1)}K`;
  return `AED ${n}`;
}
