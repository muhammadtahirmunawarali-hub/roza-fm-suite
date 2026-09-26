// Roza FM Suite — All Saved Views API (for management page)
// GET /api/erp/saved-views/all  → list all saved views across all registers
//
// TENANT ISOLATION: savedView.findMany and register.findMany are scoped via
// tenantWhere(user); a tenant only sees its own saved views and register names.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere } from '@/lib/erp/tenant';
import { forbidden } from '@/lib/erp/api-helpers';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');

  const rows = await db.savedView.findMany({
    where: { ...tenantWhere(user) },
    orderBy: [{ isShared: 'desc' }, { updatedAt: 'desc' }],
  });

  // Fetch register names for display — also scoped to current tenant
  const registerIds = Array.from(new Set(rows.map((v) => v.registerId)));
  const registers = await db.register.findMany({
    where: { id: { in: registerIds }, ...tenantWhere(user) },
    select: { id: true, name: true, code: true, icon: true, color: true },
  });
  const regMap = new Map(registers.map((r) => [r.id, r]));

  const views = rows.map((v) => {
    const reg = regMap.get(v.registerId);
    const filters = JSON.parse(v.filters);
    return {
      id: v.id,
      name: v.name,
      registerId: v.registerId,
      registerName: reg?.name || 'Unknown',
      registerCode: reg?.code || '',
      registerIcon: reg?.icon || 'fa-table',
      registerColor: reg?.color || '#64748B',
      userId: v.userId,
      isShared: v.isShared,
      filters,
      filterCount: Object.keys(filters.filters || {}).filter((k) => filters.filters[k]).length,
      hasSearch: !!filters.search,
      hasSort: !!filters.sortField,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  });

  return NextResponse.json(views);
}
