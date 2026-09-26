// Roza FM Suite — SaaS Tenant Management by ID (Super Admin only)
// DELETE /api/erp/saas/tenants/[id] → purge tenant + all its private data
// PUT    /api/erp/saas/tenants/[id] → update tenant (plan, limits, status)
//
// PERMISSIONS: both endpoints are gated by `user.role === 'Super Admin'`.
// The Super Admin's tenantId is null, so audit logs they create here are
// platform-level records (tenantId = null) and survive the tenant purge.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, forbidden, unauthorized, notFound, badRequest, serverError } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { purgeTenantData, getTenantId } from '@/lib/erp/tenant';

// DELETE a tenant and ALL of its private data (registers, records, users,
// audit logs, saved views, stock movements) via `purgeTenantData`.
// Platform/system data (tenantId = null) is NEVER touched.
// Super Admin's own data (tenantId = null) is NEVER affected.
export const DELETE = apiHandler(async (req: NextRequest, { params }: any) => {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin') return forbidden('Only Super Admin can delete tenants');

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) return notFound('Tenant not found');

  try {
    const counts = await purgeTenantData(id);

    // Audit log is created AFTER the purge so it survives. The Super Admin's
    // tenantId is null, so this log is platform-level (not deleted by purge).
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'Deleted',
        module: 'SaaS Management',
        summary: `Tenant "${tenant.name}" (${tenant.slug}) purged: ${counts.registers} register(s), ${counts.records} record(s), ${counts.users} user(s), ${counts.savedViews} saved view(s), ${counts.auditLogs} audit log(s), ${counts.stockMovements} stock movement(s)`,
        oldValue: JSON.stringify({ tenantId: id, tenantName: tenant.name, slug: tenant.slug }),
        tenantId: getTenantId(user),
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Tenant "${tenant.name}" and all its data purged`,
      counts,
    });
  } catch (e: any) {
    return serverError('Failed to purge tenant', { message: e?.message });
  }
});

// UPDATE a tenant (change plan, limits, status)
export const PUT = apiHandler(async (req: NextRequest, { params }: any) => {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin') return forbidden('Only Super Admin can update tenants');

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) return notFound('Tenant not found');

  const body = await req.json();
  const { plan, status, maxUsers, maxRecords, maxStorageMb } = body;

  // Validate plan if provided
  if (plan && !['starter', 'pro', 'enterprise', 'custom'].includes(plan)) {
    return badRequest('Invalid plan. Must be: starter, pro, enterprise, or custom');
  }

  const updated = await db.tenant.update({
    where: { id },
    data: {
      ...(plan && { plan }),
      ...(status && { status }),
      ...(maxUsers !== undefined && { maxUsers: Math.max(1, Number(maxUsers)) }),
      ...(maxRecords !== undefined && { maxRecords: Math.max(100, Number(maxRecords)) }),
      ...(maxStorageMb !== undefined && { maxStorageMb: Math.max(100, Number(maxStorageMb)) }),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'Updated',
      module: 'SaaS Management',
      summary: `Tenant "${tenant.name}" updated: ${JSON.stringify({ plan, status, maxUsers, maxRecords, maxStorageMb })}`,
      newValue: JSON.stringify(updated),
      tenantId: getTenantId(user),
    },
  });

  return NextResponse.json({ ok: true, tenant: updated });
});
