// FMCore ERP — Single Record
// GET    /api/erp/registers/[id]/records/[recordId]
// PUT    /api/erp/registers/[id]/records/[recordId]
// DELETE /api/erp/registers/[id]/records/[recordId]   (soft-delete)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { RecordData } from '@/lib/erp/types';

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
  const body = await req.json();
  const data: Record<string, any> = body.data || {};
  // Preserve auto_increment fields (don't allow editing sequence-derived numbers)
  const oldData = JSON.parse(existing.data);
  const register = await db.register.findUnique({ where: { id } });
  const columns = register ? (JSON.parse(register.columns) as any[]) : [];
  columns.forEach((col) => {
    if (col.type === 'auto_increment') data[col.name] = oldData[col.name];
  });

  const r = await db.record.update({
    where: { id: recordId },
    data: {
      data: JSON.stringify(data),
      updatedBy: 'admin',
    },
  });

  await db.auditLog.create({
    data: {
      action: 'Updated',
      module: register?.name || 'Unknown',
      registerId: id,
      recordId,
      summary: `Updated record #${existing.sequence} in "${register?.name}"`,
      oldValue: existing.data,
      newValue: JSON.stringify(data),
    },
  });

  return NextResponse.json(serialize(r));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  const existing = await db.record.findUnique({ where: { id: recordId, registerId: id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  await db.record.update({ where: { id: recordId }, data: { isDeleted: true } });

  const register = await db.register.findUnique({ where: { id } });
  await db.auditLog.create({
    data: {
      action: 'Deleted',
      module: register?.name || 'Unknown',
      registerId: id,
      recordId,
      summary: `Deleted record #${existing.sequence} from "${register?.name}"`,
      oldValue: existing.data,
    },
  });
  return NextResponse.json({ ok: true });
}
