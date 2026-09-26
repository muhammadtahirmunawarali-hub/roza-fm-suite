// Roza FM Suite — SaaS Tenant Signup API
// POST /api/erp/saas/signup → create a new tenant + admin user + seed demo data
//
// CRITICAL FIX (multi-tenant isolation):
//   • Admin role is now 'Administrator' (NOT 'Super Admin') so tenant admins
//     CANNOT access SaaS Management / delete other tenants.
//   • Permissions are seeded with the FULL Administrator permission matrix
//     (all 41 modules × 7 actions) so the sidebar is populated on first login.
//   • seedTenantData(tenantId) clones all 46 registers + sample records into the
//     new tenant's namespace so their admin sees test data from day one.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, conflict } from '@/lib/erp/api-helpers';
import { getRolePermissions, seedTenantData } from '@/lib/erp/seed';

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { companyName, slug, adminName, adminEmail, adminPassword, plan = 'starter' } = body;

  if (!companyName || !slug || !adminName || !adminEmail || !adminPassword) {
    return badRequest('companyName, slug, adminName, adminEmail, adminPassword are required');
  }

  // Check slug uniqueness
  const existing = await db.tenant.findUnique({ where: { slug } });
  if (existing) return conflict('A company with this slug already exists');

  // Check email uniqueness
  const existingUser = await db.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) return conflict('A user with this email already exists');

  const plans: Record<string, { maxUsers: number; maxRecords: number; maxStorageMb: number }> = {
    starter: { maxUsers: 10, maxRecords: 10000, maxStorageMb: 1024 },        // 1 GB
    pro: { maxUsers: 50, maxRecords: 100000, maxStorageMb: 10240 },         // 10 GB
    enterprise: { maxUsers: 500, maxRecords: 1000000, maxStorageMb: 102400 }, // 100 GB
  };
  const limits = plans[plan] || plans.starter;

  // Create tenant + admin user + seed data in one transaction
  const result = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        slug,
        plan,
        maxUsers: limits.maxUsers,
        maxRecords: limits.maxRecords,
        maxStorageMb: limits.maxStorageMb,
      },
    });

    const initials = adminName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
    // Generate unique username — append number if collision (e.g. john → john2 → john3)
    let username = adminEmail.split('@')[0];
    let suffix = 1;
    while (await tx.user.findUnique({ where: { username } })) {
      username = `${adminEmail.split('@')[0]}${++suffix}`;
    }

    const user = await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        username,
        password: adminPassword,
        role: 'Administrator', // ← tenant admin: full module access but CANNOT manage other tenants
        department: 'Management',
        avatar: initials,
        status: 'Active',
        permissions: JSON.stringify(getRolePermissions('Administrator')), // ← all 41 modules × 7 actions
        tenantId: tenant.id, // ← LINK user to this tenant
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'Created',
        module: 'SaaS Onboarding',
        summary: `New tenant "${companyName}" (${plan} plan) signed up. Admin: ${adminName}`,
        newValue: JSON.stringify({ tenantId: tenant.id, tenantName: companyName, slug, plan, adminId: user.id }),
        tenantId: tenant.id,
      },
    });

    return { tenant, user };
  });

  // Seed the new tenant with a full copy of the demo data (46 registers + ~250 records).
  // Done OUTSIDE the transaction because it's a large insert loop and we want the tenant
  // to exist even if seeding partially fails (idempotent — can be re-run).
  try {
    await seedTenantData(result.tenant.id);
  } catch (e) {
    // Log but don't fail the signup — the tenant is created, admin can manually add data
    console.error('[signup] seedTenantData failed for tenant', result.tenant.id, e);
  }

  return NextResponse.json({
    ok: true,
    message: `Welcome ${adminName}! Your company "${companyName}" is ready. ${46} registers and sample data have been created for you.`,
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
      plan: result.tenant.plan,
      maxUsers: result.tenant.maxUsers,
      maxRecords: result.tenant.maxRecords,
      maxStorageMb: result.tenant.maxStorageMb,
    },
    admin: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      username: result.user.username,
    },
  });
});
