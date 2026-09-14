// FMCore ERP — SaaS Tenant Management API (Super Admin only)
// GET /api/erp/saas/tenants → list all tenants with usage stats
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, forbidden, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin') return forbidden('Only Super Admin can view all tenants');
  
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: 'desc' },
  });
  
  // Get user count per tenant (users with tenantId matching)
  const tenantsWithCounts = await Promise.all(
    tenants.map(async (t) => {
      const tenantUserCount = await db.user.count({ where: { tenantId: t.id } });
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        status: t.status,
        maxUsers: t.maxUsers,
        maxRecords: t.maxRecords,
        maxStorageMb: t.maxStorageMb,
        stripeCustomerId: t.stripeCustomerId,
        createdAt: t.createdAt.toISOString(),
        currentUsers: tenantUserCount, // actual users belonging to this tenant
        currentRecords: 0, // records are shared (not tenant-scoped yet)
      };
    })
  );
  
  return NextResponse.json({
    ok: true,
    tenants: tenantsWithCounts,
    total: tenants.length,
  });
});
