// FMCore ERP — Saved Views API (per-user saved filters)
// GET  /api/erp/saved-views?registerId=...   → list views for a register
// POST /api/erp/saved-views                  → save a new view
// PUT  /api/erp/saved-views                  → update an existing view { id, name, filters, isShared }
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';

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
  const currentUser = await getCurrentUser(req);

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
      userId: currentUser?.id || null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: currentUser?.id || null,
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

export async function PUT(req: NextRequest) {
  const currentUser = await getCurrentUser(req);

  const body = await req.json();
  const { id, name, filters, isShared } = body;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'View ID required' }, { status: 400 });
  }

  const existing = await db.savedView.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'View not found' }, { status: 404 });
  }

  const updated = await db.savedView.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(filters !== undefined && { filters: JSON.stringify(filters) }),
      ...(isShared !== undefined && { isShared }),
    },
  });

  await db.auditLog.create({
    data: {
      userId: currentUser?.id || null,
      action: 'Updated',
      module: 'Saved Views',
      summary: `Updated view "${existing.name}"`,
      oldValue: JSON.stringify({ name: existing.name, isShared: existing.isShared }),
      newValue: JSON.stringify({ name: updated.name, isShared: updated.isShared }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    registerId: updated.registerId,
    userId: updated.userId,
    isShared: updated.isShared,
    filters: JSON.parse(updated.filters),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
