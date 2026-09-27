// Roza FM Suite — Auth: Login
// POST /api/erp/auth/login  { username, password }
// Sets a session cookie (fmcore_session) and returns the user.
// Passwords are verified with bcrypt (never plaintext comparison).
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { seedDatabase } from '@/lib/erp/seed';
import { verifyPassword } from '@/lib/erp/password';
import crypto from 'crypto';
import { apiHandler, badRequest, unauthorized, forbidden } from '@/lib/erp/api-helpers';

export const POST = apiHandler(async (req) => {
  // Make sure users are seeded
  await seedDatabase(false);

  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return badRequest('Username and password are required');
  }

  const user = await db.user.findUnique({
    where: { username: String(username).toLowerCase() },
  });

  // Verify password with bcrypt. If the stored value isn't a bcrypt hash
  // (legacy plaintext), verifyPassword returns false — forces a reset.
  const passwordOk = user ? await verifyPassword(password, user.password) : false;

  if (!user || !passwordOk) {
    await db.auditLog.create({
      data: {
        action: 'Updated',
        module: 'Auth',
        summary: `Failed login attempt for "${username}"`,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      },
    });
    // Use a generic message to avoid leaking which of username/password was wrong
    return unauthorized('Invalid username or password');
  }

  if (user.status !== 'Active') {
    return forbidden(`Account is ${user.status}. Contact your administrator.`);
  }

  // Create session
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.session.create({
    data: {
      userId: user.id,
      token,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      expiresAt,
    },
  });

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'Created',
      module: 'Auth',
      summary: `User "${user.name}" logged in`,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    },
  });

  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      branch: user.branch,
      department: user.department,
      avatar: user.avatar,
      status: user.status,
      permissions: JSON.parse(user.permissions),
      tenantId: user.tenantId, // SaaS: links user to their tenant company (null = Super Admin)
      mustChangePassword: user.mustChangePassword, // true = force password change on next page load
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
    },
  });

  res.cookies.set('fmcore_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return res;
});
