// Roza FM Suite — Master Data (for dropdowns: employees, departments, buildings, etc.)
// TENANT ISOLATION: derives options only from the current tenant's records.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MASTER_DATA } from '@/lib/erp/seed';
import type { ColumnDef } from '@/lib/erp/types';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere } from '@/lib/erp/tenant';
import { forbidden } from '@/lib/erp/api-helpers';

// Dynamically derive master data from existing records (employees referenced in 'employee' columns, etc.)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');

  const registers = await db.register.findMany({
    where: { ...tenantWhere(user), isDeleted: false },
    include: { records: { where: { ...tenantWhere(user), isDeleted: false } } },
  });

  const derived: Record<string, Set<string>> = {
    employee: new Set(MASTER_DATA.employee),
    department: new Set(MASTER_DATA.department),
    building: new Set(MASTER_DATA.building),
    asset: new Set(MASTER_DATA.asset),
    equipment: new Set(MASTER_DATA.equipment),
    vendor: new Set(MASTER_DATA.vendor),
  };

  const typeToKey: Record<string, keyof typeof derived> = {
    employee: 'employee',
    department: 'department',
    building: 'building',
    asset: 'asset',
    equipment: 'equipment',
    vendor: 'vendor',
  };

  registers.forEach((r) => {
    const cols = JSON.parse(r.columns) as ColumnDef[];
    const lookupCols = cols.filter((c) => typeToKey[c.type]);
    r.records.forEach((rec) => {
      const data = JSON.parse(rec.data);
      lookupCols.forEach((col) => {
        const v = data[col.name];
        const key = typeToKey[col.type];
        if (v) {
          if (Array.isArray(v)) v.forEach((x) => derived[key].add(String(x)));
          else derived[key].add(String(v));
        }
      });
    });
  });

  const out: Record<string, string[]> = {};
  Object.entries(derived).forEach(([k, set]) => { out[k] = Array.from(set).sort(); });
  return NextResponse.json(out);
}
