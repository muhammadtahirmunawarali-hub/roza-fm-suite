// FMCore ERP — SaaS Tenant Signup API
// POST /api/erp/saas/signup → create a new tenant + admin user
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, conflict } from '@/lib/erp/api-helpers';
import { randomBytes } from 'crypto';

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
  
  const plans: Record<string, { maxUsers: number; maxRecords: number }> = {
    starter: { maxUsers: 10, maxRecords: 10000 },
    pro: { maxUsers: 50, maxRecords: 100000 },
    enterprise: { maxUsers: 500, maxRecords: 1000000 },
  };
  const limits = plans[plan] || plans.starter;
  
  // Create tenant + admin user in transaction
  const result = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: companyName, slug, plan, maxUsers: limits.maxUsers, maxRecords: limits.maxRecords },
    });
    
    const initials = adminName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const username = adminEmail.split('@')[0];
    
    const user = await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        username,
        password: adminPassword,
        role: 'Super Admin',
        department: 'Management',
        avatar: initials,
        status: 'Active',
        permissions: JSON.stringify([{ module: 'dashboard', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import'] }]),
        // In production with multi-tenant: tenantId: tenant.id
      },
    });
    
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'Created',
        module: 'SaaS Onboarding',
        summary: `New tenant "${companyName}" (${plan} plan) signed up. Admin: ${adminName}`,
        newValue: JSON.stringify({ tenantId: tenant.id, tenantName: companyName, slug, plan, adminId: user.id }),
      },
    });
    
    return { tenant, user };
  });
  
  return NextResponse.json({
    ok: true,
    message: `Welcome ${adminName}! Your company "${companyName}" is ready.`,
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
      plan: result.tenant.plan,
      maxUsers: result.tenant.maxUsers,
      maxRecords: result.tenant.maxRecords,
    },
    admin: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      username: result.user.username,
    },
  });
});
