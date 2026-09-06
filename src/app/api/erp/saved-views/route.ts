// FMCore ERP — Saved Views API (per-user saved filters)
// GET  /api/erp/saved-views?registerId=...   → list views for a register
// POST /api/erp/saved-views                  → save a new view
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const registerId = req.nextUrl.searchParams.get('registerId');
  if (!registerId) {
    return NextResponse.json([]);
  }
  const rows = await db.savedView.findMany({
    where: { OR: [{ registerId }, { isShared: true }] },
    orderBy: [{ isShared: 'desc' }, { name: 'asc' }],
  });
  return NextResponse.json(rows.map((v) => ({
    id: v.id,
    name: v.name,
    registerId: v.registerId,
    userId: v.userId,
    isShared: v.isShared,
    filters: JSON.parse(v.filters),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, registerId, filters, isShared } = body;
  if (!name || !registerId) {
    return NextResponse.json({ ok: false, error: 'Name and registerId required' }, { status: 400 });
  }

  const view = await db.savedView.create({
    data: {
      name,
      registerId,
      filters: JSON.stringify(filters || {}),
      isShared: !!isShared,
    },
  });

  await db.auditLog.create({
    data: {
      action: 'Created',
      module: 'Saved Views',
      summary: `Saved view "${name}" for register`,
      newValue: JSON.stringify({ name, registerId, isShared }),
    },
  });

  return NextResponse.json({
    id: view.id,
    name: view.name,
    registerId: view.registerId,
    userId: view.userId,
    isShared: view.isShared,
    filters: JSON.parse(view.filters),
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
  });
}
