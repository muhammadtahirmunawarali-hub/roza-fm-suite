// Roza FM Suite — Auth: Logout
// POST /api/erp/auth/logout
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler } from '@/lib/erp/api-helpers';

export const POST = apiHandler(async (req) => {
  const nreq = req as NextRequest;
  const token = nreq.cookies.get('fmcore_session')?.value;
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
            ip: nreq.headers.get('x-forwarded-for') || nreq.headers.get('x-real-ip') || 'unknown',
          },
        });
      }
    } catch {}
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('fmcore_session');
  return res;
});
