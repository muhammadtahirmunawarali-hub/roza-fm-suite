// Roza FM Suite — Register by ID
// GET    /api/erp/registers/[id]   → get one register (tenant-scoped)
// PUT    /api/erp/registers/[id]   → update a register (tenant-scoped)
// DELETE /api/erp/registers/[id]   → soft-delete a register (tenant-scoped)
//
// TENANT ISOLATION:
//   • Super Admin (tenantId = null) sees only platform/system registers.
//   • Tenant users see only their own tenant's registers.
//   • Uses `findFirst` with `tenantWhere(user)` (not `findUnique`) so an attacker
//     cannot read/update/delete another tenant's register by guessing its id (IDOR).
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Register, ColumnDef, RegisterCategory } from '@/lib/erp/types';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere, getTenantId } from '@/lib/erp/tenant';
import { forbidden } from '@/lib/erp/api-helpers';

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');
  const { id } = await params;
  // IDOR fix: findUnique only filters by @id; use findFirst with tenantWhere to scope by tenant
  const r = await db.register.findFirst({ where: { id, ...tenantWhere(user) } });
  if (!r || r.isDeleted) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json(serialize(r));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');
  const { id } = await params;
  // IDOR fix: scope by tenant so a tenant user cannot edit another tenant's register
  const r = await db.register.findFirst({ where: { id, ...tenantWhere(user) } });
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
      userId: user.id,
      tenantId: getTenantId(user),
    },
  });
  return NextResponse.json(serialize(updated));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  if (!['Super Admin', 'Administrator'].includes(user.role)) {
    return NextResponse.json({ ok: false, error: 'Only admins can delete registers' }, { status: 403 });
  }
  const { id } = await params;
  // IDOR fix: scope by tenant so a tenant user cannot delete another tenant's register
  const r = await db.register.findFirst({ where: { id, ...tenantWhere(user) } });
  if (!r) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // System registers can only be deleted by Super Admin
  if (r.isSystem && user.role !== 'Super Admin') {
    return NextResponse.json({ ok: false, error: 'System registers can only be deleted by Super Admin' }, { status: 400 });
  }

  // Soft-delete register and all its records.
  // The records are already tenant-scoped at the register level (verified above),
  // so this updateMany only touches records that belong to the caller's tenant.
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
      tenantId: getTenantId(user),
    },
  });
  return NextResponse.json({ ok: true });
}
