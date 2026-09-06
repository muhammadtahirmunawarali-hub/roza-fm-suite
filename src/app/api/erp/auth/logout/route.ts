// FMCore ERP — Auth: Logout
// POST /api/erp/auth/logout
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('fmcore_session')?.value;
  if (token) {
    // Delete session from DB
    try {
      const session = await db.session.findUnique({ where: { token } });
      if (session) {
        await db.session.delete({ where: { token } });
        await db.auditLog.create({
          data: {
            userId: session.userId,
            action: 'Deleted',
            module: 'Auth',
            summary: `User logged out`,
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          },
        });
      }
    } catch {}
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('fmcore_session');
  return res;
}
