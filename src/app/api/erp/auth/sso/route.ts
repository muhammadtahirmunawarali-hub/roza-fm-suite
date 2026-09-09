import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const provider = url.searchParams.get('provider') || '';
  if (provider === 'dev') {
    const devUser = await db.user.findUnique({ where: { username: 'admin' } });
    if (!devUser) return NextResponse.json({ ok: false, error: 'No users found' }, { status: 404 });
    const token = randomBytes(32).toString('hex');
    await db.session.create({ data: { token, userId: devUser.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    await db.auditLog.create({ data: { userId: devUser.id, action: 'Logged In', module: 'Auth', summary: `SSO (dev) login for ${devUser.name}` } }).catch(() => {});
    const res = NextResponse.redirect(new URL('/', url.origin));
    res.cookies.set('fmcore_session', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/' });
    return res;
  }
  return NextResponse.json({ ok: false, error: 'Provider not configured. Use ?provider=dev for dev mode.' }, { status: 400 });
}
