// FMCore ERP — Single Record
// GET    /api/erp/registers/[id]/records/[recordId]
// PUT    /api/erp/registers/[id]/records/[recordId]   (requires 'edit' permission)
// DELETE /api/erp/registers/[id]/records/[recordId]   (requires 'delete' permission, soft-delete)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { RecordData } from '@/lib/erp/types';
import { getCurrentUser, hasPermission } from '@/lib/erp/auth';

function serialize(r: any): RecordData {
  return {
    id: r.id,
    registerId: r.registerId,
    sequence: r.sequence,
    data: JSON.parse(r.data),
    isDeleted: r.isDeleted,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    createdBy: r.createdBy,
    updatedBy: r.updatedBy,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  const r = await db.record.findUnique({ where: { id: recordId, registerId: id } });
  if (!r || r.isDeleted) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json(serialize(r));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  const existing = await db.record.findUnique({ where: { id: recordId, registerId: id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
  const register = await db.register.findUnique({ where: { id } });
  if (!register) return NextResponse.json({ ok: false, error: 'Register not found' }, { status: 404 });

  // Server-side permission check
  const user = await getCurrentUser(req);
  if (user && !hasPermission(user, register.code, 'edit')) {
    return NextResponse.json({ ok: false, error: "You don't have 'edit' permission for this register" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, any> = body.data || {};
  // Preserve auto_increment fields (don't allow editing sequence-derived numbers)
  const oldData = JSON.parse(existing.data);
  const columns = JSON.parse(register.columns) as any[];
  columns.forEach((col) => {
    if (col.type === 'auto_increment') data[col.name] = oldData[col.name];
  });

  const r = await db.record.update({
    where: { id: recordId },
    data: {
      data: JSON.stringify(data),
      updatedBy: user?.username || 'system',
    },
  });

  await db.auditLog.create({
    data: {
      userId: user?.id || null,
      action: 'Updated',
      module: register.name,
      registerId: id,
      recordId,
      summary: `Updated record #${existing.sequence} in "${register.name}"`,
      oldValue: existing.data,
      newValue: JSON.stringify(data),
    },
  });

  return NextResponse.json(serialize(r));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  const existing = await db.record.findUnique({ where: { id: recordId, registerId: id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const register = await db.register.findUnique({ where: { id } });
  if (!register) return NextResponse.json({ ok: false, error: 'Register not found' }, { status: 404 });

  // Server-side permission check
  const user = await getCurrentUser(req);
  if (user && !hasPermission(user, register.code, 'delete')) {
    return NextResponse.json({ ok: false, error: "You don't have 'delete' permission for this register" }, { status: 403 });
  }

  await db.record.update({ where: { id: recordId }, data: { isDeleted: true } });

  await db.auditLog.create({
    data: {
      userId: user?.id || null,
      action: 'Deleted',
      module: register.name,
      registerId: id,
      recordId,
      summary: `Deleted record #${existing.sequence} from "${register.name}"`,
      oldValue: existing.data,
    },
  });
  return NextResponse.json({ ok: true });
}
