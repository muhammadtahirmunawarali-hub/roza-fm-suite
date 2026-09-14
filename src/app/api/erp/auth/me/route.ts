// FMCore ERP — Auth: Current user (GET /api/erp/auth/me)
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { seedDatabase } from '@/lib/erp/seed';
import { apiHandler } from '@/lib/erp/api-helpers';

export const GET = apiHandler(async (req) => {
  await seedDatabase(false);

  const nreq = req as NextRequest;
  const token = nreq.cookies.get('fmcore_session')?.value;
  if (!token) {
    return NextResponse.json({ ok: false, authenticated: false, reason: 'no_session' });
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      // Expired — clean up
      await db.session.delete({ where: { token } }).catch(() => {});
    }
    return NextResponse.json({ ok: false, authenticated: false, reason: 'expired' });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      username: session.user.username,
      role: session.user.role,
      branch: session.user.branch,
      department: session.user.department,
      avatar: session.user.avatar,
      status: session.user.status,
      permissions: JSON.parse(session.user.permissions),
      tenantId: session.user.tenantId, // SaaS: null = Super Admin, otherwise tenant ID
      lastLoginAt: session.user.lastLoginAt?.toISOString() || null,
    },
  });
});
