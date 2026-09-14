// FMCore ERP — SaaS Tenant Management by ID (Super Admin only)
// DELETE /api/erp/saas/tenants/[id] → delete tenant + all its users
// PUT /api/erp/saas/tenants/[id] → update tenant (plan, limits, status)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, forbidden, unauthorized, notFound, badRequest } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';

// DELETE a tenant and ALL its users (data isolation: only tenant's users are deleted)
// Super Admin's demo data (tenantId=null) is NEVER affected
export const DELETE = apiHandler(async (req: NextRequest, { params }: any) => {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin') return forbidden('Only Super Admin can delete tenants');

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) return notFound('Tenant not found');

  // Delete in transaction: tenant's users → tenant
  // Note: records/registers are shared (not tenant-scoped yet) so they're NOT deleted
  // In full multi-tenant mode, records with tenantId would also be deleted here
  await db.$transaction(async (tx) => {
    // Delete all users belonging to this tenant
    const deletedUsers = await tx.user.deleteMany({ where: { tenantId: id } });
    
    // Delete the tenant
    await tx.tenant.delete({ where: { id } });
    
    // Audit log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'Deleted',
        module: 'SaaS Management',
        summary: `Tenant "${tenant.name}" (${tenant.slug}) deleted with ${deletedUsers.count} user(s)`,
        oldValue: JSON.stringify({ tenantId: id, tenantName: tenant.name, slug: tenant.slug }),
      },
    });
  });

  return NextResponse.json({ ok: true, message: `Tenant "${tenant.name}" and all its users deleted` });
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
    },
  });

  return NextResponse.json({ ok: true, tenant: updated });
});
