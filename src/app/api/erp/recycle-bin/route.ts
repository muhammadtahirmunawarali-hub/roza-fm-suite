// Roza FM Suite — Recycle Bin API
// GET  /api/erp/recycle-bin → list all soft-deleted records
// POST /api/erp/recycle-bin?id=...&action=restore → restore a record
// DELETE /api/erp/recycle-bin?id=... → permanently delete a record
// TENANT ISOLATION: every query scoped via tenantWhere(user); finds by id use findFirst
// to prevent IDOR across tenants.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, forbidden, unauthorized, notFound } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere, getTenantId } from '@/lib/erp/tenant';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  
  const deletedRecords = await db.record.findMany({
    where: { ...tenantWhere(user), isDeleted: true },
    include: { register: true },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  
  return NextResponse.json({
    ok: true,
    items: deletedRecords.map(r => ({
      id: r.id,
      registerId: r.registerId,
      registerName: r.register.name,
      registerCode: r.register.code,
      registerIcon: r.register.icon,
      registerColor: r.register.color,
      sequence: r.sequence,
      data: JSON.parse(r.data),
      deletedAt: r.updatedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
    count: deletedRecords.length,
  });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return badRequest('id parameter required');
  
  const record = await db.record.findFirst({ where: { id, ...tenantWhere(user) } });
  if (!record || !record.isDeleted) return notFound('Deleted record not found');
  
  await db.record.update({ where: { id }, data: { isDeleted: false } });
  
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'Restored',
      module: 'Recycle Bin',
      recordId: id,
      summary: `Restored record #${record.sequence} from recycle bin`,
      tenantId: getTenantId(user),
    },
  });
  
  return NextResponse.json({ ok: true, message: 'Record restored' });
});

export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin' && user.role !== 'Administrator') return forbidden('Only admins can permanently delete');
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return badRequest('id parameter required');
  
  const record = await db.record.findFirst({ where: { id, ...tenantWhere(user) } });
  if (!record) return notFound('Record not found');
  
  await db.record.delete({ where: { id } });
  
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'Permanently Deleted',
      module: 'Recycle Bin',
      recordId: id,
      summary: `Permanently deleted record #${record.sequence}`,
      tenantId: getTenantId(user),
    },
  });
  
  return NextResponse.json({ ok: true, message: 'Record permanently deleted' });
});
