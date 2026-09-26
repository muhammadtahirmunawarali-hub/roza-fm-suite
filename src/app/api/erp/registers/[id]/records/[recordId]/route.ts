// Roza FM Suite — Single Record
// GET    /api/erp/registers/[id]/records/[recordId]
// PUT    /api/erp/registers/[id]/records/[recordId]   (requires 'edit' permission)
// DELETE /api/erp/registers/[id]/records/[recordId]   (requires 'delete' permission, soft-delete)
//
// TENANT ISOLATION:
//   • The record lookup is scoped by tenant via `findFirst` (Prisma findUnique does
//     not accept non-unique fields like tenantId in `where`).
//   • The parent register is also scoped by tenant.
//   • Audit log entries created here are tenant-scoped.
//   • This prevents IDOR — a tenant user cannot access another tenant's record by id.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { RecordData, ColumnDef } from '@/lib/erp/types';
import {
  apiHandler,
  requirePermission,
  validateRecordData,
  badRequest,
  notFound,
  forbidden,
} from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere, getTenantId } from '@/lib/erp/tenant';

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

export const GET = apiHandler(async (req, { params }) => {
  const { id, recordId } = await params;
  const user = await getCurrentUser(req as NextRequest);
  if (!user) return forbidden('Authentication required');

  const r = await db.record.findFirst({
    where: { id: recordId, registerId: id, ...tenantWhere(user) },
  });
  if (!r || r.isDeleted) return notFound('Not found');
  return NextResponse.json(serialize(r));
});

export const PUT = apiHandler(async (req, { params }) => {
  const { id, recordId } = await params;
  const user = await getCurrentUser(req as NextRequest);
  if (!user) return forbidden('Authentication required');

  const existing = await db.record.findFirst({
    where: { id: recordId, registerId: id, ...tenantWhere(user) },
  });
  if (!existing || existing.isDeleted) {
    return notFound('Not found');
  }
  // Scope the parent register by tenant — defensive (should match existing.registerId's tenant)
  const register = await db.register.findFirst({
    where: { id, ...tenantWhere(user) },
  });
  if (!register) return notFound('Register not found');

  // Server-side permission check
  const [permUser, permError] = await requirePermission(req, register.code, 'edit');
  if (permError) return permError;
  void permUser;

  const body = await req.json();
  const data: Record<string, any> = body.data || {};
  // Preserve auto_increment fields (don't allow editing sequence-derived numbers)
  const oldData = JSON.parse(existing.data);
  const columns = JSON.parse(register.columns) as ColumnDef[];
  columns.forEach((col) => {
    if (col.type === 'auto_increment') data[col.name] = oldData[col.name];
  });

  // Validate the data against the register's columns
  const validationErrors = validateRecordData(data, columns);
  if (validationErrors.length > 0) {
    return badRequest('Validation failed', validationErrors);
  }

  const tenantId = getTenantId(user);

  // Wrap update + audit log in a transaction
  const r = await db.$transaction(async (tx) => {
    const updated = await tx.record.update({
      where: { id: recordId },
      data: {
        data: JSON.stringify(data),
        updatedBy: user.username,
        // Preserve tenantId (defensive — should never change on update)
        tenantId,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'Updated',
        module: register.name,
        registerId: id,
        recordId,
        summary: `Updated record #${existing.sequence} in "${register.name}"`,
        oldValue: existing.data,
        newValue: JSON.stringify(data),
        tenantId, // ← tenant-scoped
      },
    });
    return updated;
  });

  return NextResponse.json(serialize(r));
});

export const DELETE = apiHandler(async (req, { params }) => {
  const { id, recordId } = await params;
  const user = await getCurrentUser(req as NextRequest);
  if (!user) return forbidden('Authentication required');

  const existing = await db.record.findFirst({
    where: { id: recordId, registerId: id, ...tenantWhere(user) },
  });
  if (!existing) return notFound('Not found');
  const register = await db.register.findFirst({
    where: { id, ...tenantWhere(user) },
  });
  if (!register) return notFound('Register not found');

  // Server-side permission check
  const [permUser, permError] = await requirePermission(req, register.code, 'delete');
  if (permError) return permError;
  void permUser;

  const tenantId = getTenantId(user);

  // Wrap soft-delete + audit log in a transaction
  await db.$transaction(async (tx) => {
    await tx.record.update({ where: { id: recordId }, data: { isDeleted: true } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'Deleted',
        module: register.name,
        registerId: id,
        recordId,
        summary: `Deleted record #${existing.sequence} from "${register.name}"`,
        oldValue: existing.data,
        tenantId, // ← tenant-scoped
      },
    });
  });

  return NextResponse.json({ ok: true });
});
