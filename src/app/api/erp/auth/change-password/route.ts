// Roza FM Suite — Auth: Change Password
// POST /api/erp/auth/change-password  { currentPassword, newPassword }
//
// Used by:
//   1. The force-password-change modal (when mustChangePassword = true)
//   2. The Settings → Profile page (user voluntarily changes their password)
//
// Verifies the current password (bcrypt), hashes the new one, clears mustChangePassword.
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';
import { verifyPassword, hashPassword } from '@/lib/erp/password';
import { apiHandler, badRequest, unauthorized } from '@/lib/erp/api-helpers';

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized('Authentication required');

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return badRequest('Current password and new password are required');
  }
  if (newPassword.length < 8) {
    return badRequest('New password must be at least 8 characters');
  }
  if (currentPassword === newPassword) {
    return badRequest('New password must be different from the current password');
  }

  // Fetch the stored hash
  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return unauthorized('User not found');

  // Verify the current password
  const ok = await verifyPassword(currentPassword, dbUser.password);
  if (!ok) {
    return unauthorized('Current password is incorrect');
  }

  // Hash + save the new password, clear the must-change flag
  const newHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: user.id },
    data: {
      password: newHash,
      mustChangePassword: false,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'Updated',
      module: 'Auth',
      summary: `User "${user.name}" changed their password`,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      tenantId: user.tenantId,
    },
  });

  return NextResponse.json({
    ok: true,
    message: 'Password changed successfully',
    mustChangePassword: false,
  });
});
