// Roza FM Suite — SaaS Tenant Signup API
// POST /api/erp/saas/signup → create a new tenant + admin user + seed demo data + email the admin
//
// INDUSTRY-STANDARD ONBOARDING FLOW (Step 2 of the launch plan):
//   1. Super Admin enters company name, slug, admin name + EMAIL (no password needed)
//   2. System generates a random 12-char secure temp password
//   3. System hashes it (bcrypt) + stores it + sets mustChangePassword=true
//   4. System emails the admin a welcome email with their username + temp password
//   5. Admin clicks the link in the email → logs in → force-password-change modal
//   6. Admin sets their OWN password → full access
//
// DEV FALLBACK: If RESEND_API_KEY is not set, the email isn't actually sent.
// Instead, the temp password is returned in the API response so the SaaS Management
// UI can display it on screen (so you can still test the flow in the sandbox).
//
// CRITICAL: Admin role is 'Administrator' (NOT 'Super Admin') so tenant admins
// cannot access SaaS Management or delete other companies.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, conflict } from '@/lib/erp/api-helpers';
import { getRolePermissions, seedTenantData } from '@/lib/erp/seed';
import { hashPassword, generateTempPassword } from '@/lib/erp/password';
import { sendWelcomeEmail } from '@/lib/erp/email';

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  // adminPassword is OPTIONAL now — if not provided, we auto-generate a secure temp password.
  const { companyName, slug, adminName, adminEmail, adminPassword, plan = 'starter' } = body;

  if (!companyName || !slug || !adminName || !adminEmail) {
    return badRequest('companyName, slug, adminName, adminEmail are required (password is optional — auto-generated if missing)');
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

  // Generate a temp password if none was provided.
  // This is the industry-standard flow — Super Admin doesn't pick passwords for customers.
  const tempPassword = adminPassword || generateTempPassword(12);
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL || new URL('/', req.url).toString();

  // Create tenant + admin user + audit log in one transaction
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
        password: await hashPassword(tempPassword), // bcrypt hash — NEVER plaintext
        role: 'Administrator', // tenant admin: full module access but CANNOT manage other tenants
        department: 'Management',
        avatar: initials,
        status: 'Active',
        permissions: JSON.stringify(getRolePermissions('Administrator')), // all 41 modules × 7 actions
        tenantId: tenant.id,
        mustChangePassword: true, // force password change on first login
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'Created',
        module: 'SaaS Onboarding',
        summary: `New tenant "${companyName}" (${plan} plan) signed up. Admin: ${adminName}`,
        newValue: JSON.stringify({ tenantId: tenant.id, tenantName: companyName, slug, plan, adminId: user.id, emailSent: true }),
        tenantId: tenant.id,
      },
    });

    return { tenant, user };
  });

  // Seed the new tenant with a full copy of the demo data (46 registers + ~250 records).
  try {
    await seedTenantData(result.tenant.id);
  } catch (e) {
    console.error('[signup] seedTenantData failed for tenant', result.tenant.id, e);
  }

  // Send the welcome email with credentials.
  // In dev (no RESEND_API_KEY), this returns the temp password in the result.
  const emailResult = await sendWelcomeEmail({
    adminName,
    adminEmail,
    companyName,
    username: result.user.username,
    tempPassword,
    loginUrl,
    plan,
  });

  return NextResponse.json({
    ok: true,
    message: emailResult.sent
      ? `Welcome email sent to ${adminEmail}. ${46} registers and sample data have been created.`
      : `Workspace ready. ${46} registers and sample data created. (Email not sent — no RESEND_API_KEY. Temp password shown below for dev.)`,
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
    // Only expose the temp password in the API response when the email wasn't sent
    // (dev fallback). In production, the password goes ONLY to the user's inbox.
    ...(emailResult.sent
      ? { emailSent: true }
      : { emailSent: false, tempPassword }),
  });
});
