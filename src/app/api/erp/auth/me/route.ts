// FMCore ERP — Auth: Current user (GET /api/erp/auth/me)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { seedDatabase } from '@/lib/erp/seed';

export async function GET(req: NextRequest) {
  await seedDatabase(false);

  const token = req.cookies.get('fmcore_session')?.value;
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
      lastLoginAt: session.user.lastLoginAt?.toISOString() || null,
    },
  });
}
