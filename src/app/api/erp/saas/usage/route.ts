// Roza FM Suite — SaaS Usage Stats API
// GET /api/erp/saas/usage → current tenant usage (users, records, storage)
//
// TENANT ISOLATION:
//   • records, registers, and auditLogs are scoped via tenantWhere(user).
//   • Super Admin (tenantId = null) sees platform usage (tenantId IS NULL).
//   • Tenant users see only their own tenant's usage.
//   • Users are managed separately and counted globally for now (the current user's
//     tenantId is implicit but the count is for active users across the system).
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere } from '@/lib/erp/tenant';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();

  const [userCount, recordCount, registerCount, auditLogCount] = await Promise.all([
    db.user.count({ where: { status: 'Active' } }),
    db.record.count({ where: { ...tenantWhere(user), isDeleted: false } }),
    db.register.count({ where: { ...tenantWhere(user), isDeleted: false } }),
    db.auditLog.count({ where: { ...tenantWhere(user) } }),
  ]);

  return NextResponse.json({
    ok: true,
    usage: {
      users: { current: userCount, limit: 10, plan: 'starter' },
      records: { current: recordCount, limit: 10000 },
      registers: { current: registerCount, unlimited: true },
      auditLogs: { current: auditLogCount },
      storage: { uploads: '0 MB', limit: '1 GB' },
    },
    plan: 'starter',
    status: 'active',
  });
});
