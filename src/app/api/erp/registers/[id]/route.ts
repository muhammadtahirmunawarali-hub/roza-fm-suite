// FMCore ERP — Register by ID
// GET    /api/erp/registers/[id]   → get one register
// PUT    /api/erp/registers/[id]   → update a register
// DELETE /api/erp/registers/[id]   → soft-delete a register
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Register, ColumnDef, RegisterCategory } from '@/lib/erp/types';
import { getCurrentUser } from '@/lib/erp/auth';

function serialize(r: any): Register {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    icon: r.icon,
    category: r.category as RegisterCategory,
    color: r.color,
    description: r.description,
    columns: JSON.parse(r.columns) as ColumnDef[],
    isSystem: r.isSystem,
    isDeleted: r.isDeleted,
    order: r.order,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await db.register.findUnique({ where: { id } });
  if (!r || r.isDeleted) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json(serialize(r));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await db.register.findUnique({ where: { id } });
  if (!r || r.isDeleted) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const { name, icon, category, color, description, columns } = body;
  const updated = await db.register.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
      ...(category !== undefined && { category }),
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description }),
      ...(columns !== undefined && { columns: JSON.stringify(columns) }),
    },
  });
  await db.auditLog.create({
    data: {
      action: 'Updated',
      module: r.name,
      registerId: r.id,
      summary: `Updated register "${r.name}"`,
      oldValue: JSON.stringify(serialize(r)),
      newValue: JSON.stringify(serialize(updated)),
    },
  });
  return NextResponse.json(serialize(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await db.register.findUnique({ where: { id } });
  if (!r) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // Check permissions — Super Admin can delete ANY register (including system)
  const user = await getCurrentUser(_req);
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  if (!['Super Admin', 'Administrator'].includes(user.role)) {
    return NextResponse.json({ ok: false, error: 'Only admins can delete registers' }, { status: 403 });
  }
  // System registers can only be deleted by Super Admin
  if (r.isSystem && user.role !== 'Super Admin') {
    return NextResponse.json({ ok: false, error: 'System registers can only be deleted by Super Admin' }, { status: 400 });
  }

  // Soft-delete register and all its records
  await db.record.updateMany({ where: { registerId: id }, data: { isDeleted: true } });
  await db.register.update({ where: { id }, data: { isDeleted: true } });
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'Deleted',
      module: r.name,
      registerId: r.id,
      summary: `Deleted register "${r.name}"${r.isSystem ? ' (SYSTEM)' : ''}`,
      oldValue: JSON.stringify(serialize(r)),
    },
  });
  return NextResponse.json({ ok: true });
}
