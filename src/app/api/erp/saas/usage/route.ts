// FMCore ERP — SaaS Usage Stats API
// GET /api/erp/saas/usage → current tenant usage (users, records, storage)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  
  const [userCount, recordCount, registerCount, auditLogCount] = await Promise.all([
    db.user.count({ where: { status: 'Active' } }),
    db.record.count({ where: { isDeleted: false } }),
    db.register.count({ where: { isDeleted: false } }),
    db.auditLog.count(),
  ]);
  
  // In multi-tenant mode, these would be scoped by tenantId
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
