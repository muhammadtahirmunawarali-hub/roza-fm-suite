// FMCore ERP — All Saved Views API (for management page)
// GET /api/erp/saved-views/all  → list all saved views across all registers
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const rows = await db.savedView.findMany({
    orderBy: [{ isShared: 'desc' }, { updatedAt: 'desc' }],
  });

  // Fetch register names for display
  const registerIds = Array.from(new Set(rows.map((v) => v.registerId)));
  const registers = await db.register.findMany({
    where: { id: { in: registerIds } },
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
