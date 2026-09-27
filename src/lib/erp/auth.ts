// Roza FM Suite — Server-side auth + permission helpers
// Shared across all API routes that need permission checks.
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  department: string | null;
  avatar: string | null;
  status: string;
  permissions: { module: string; actions: string[] }[];
  tenantId: string | null; // SaaS: null = Super Admin / system user, otherwise links to Tenant
  mustChangePassword: boolean; // true = force password change on next page load
}

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get('fmcore_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { token } }).catch(() => {});
    }
    return null;
  }

  if (session.user.status !== 'Active') return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    username: session.user.username,
    role: session.user.role,
    department: session.user.department,
    avatar: session.user.avatar,
    status: session.user.status,
    permissions: JSON.parse(session.user.permissions),
    tenantId: session.user.tenantId,
    mustChangePassword: session.user.mustChangePassword,
  };
}

/**
 * Check if a user has a specific permission for a module.
 * Super Admin always has all permissions.
 */
export function hasPermission(user: AuthUser | null, module: string, action: string): boolean {
  if (!user) return false;
  if (user.role === 'Super Admin') return true;
  const perm = user.permissions.find((p) => p.module === module);
  return !!perm && perm.actions.includes(action);
}

/**
 * Require authentication. Returns the user if authenticated, or null if not.
 * Use this when you want to allow unauthenticated access for backward compat
 * but still want to identify the user if present.
 */
export async function getOptionalUser(req: NextRequest): Promise<AuthUser | null> {
  return getCurrentUser(req);
}
