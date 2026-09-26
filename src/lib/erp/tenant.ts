// Roza FM Suite — Tenant context + scoping helpers (SaaS multi-tenancy)
//
// DATA ISOLATION MODEL
// ────────────────────
// • Super Admin (tenantId = null) sees ONLY platform/system data (tenantId IS NULL).
//   This is the "platform owner" account — they manage tenants from SaaS Management
//   but do NOT see any tenant's private business data.
// • Tenant users (tenantId = "<tenantId>") see ONLY their own tenant's data.
//   They cannot read, write, or list another tenant's registers/records.
//
// This is enforced at the Prisma query layer via `tenantWhere(user)` so every
// findMany / count / create is automatically scoped.
import { db } from '@/lib/db';
import type { AuthUser } from './auth';

/**
 * Returns the tenant id for scoping data queries.
 *  - null  → user is Super Admin / system user → queries scope to `tenantId: null`
 *  - "<id>" → user belongs to a tenant → queries scope to that tenant id
 */
export function getTenantId(user: AuthUser | null): string | null {
  if (!user) return null;
  // Super Admin (platform owner) has tenantId = null in the DB
  return user.tenantId ?? null;
}

/**
 * Prisma `where` clause fragment that scopes a query to the current user's tenant.
 *
 * Usage:
 *   const where = { ...tenantWhere(user), isDeleted: false };
 *   const rows = await db.register.findMany({ where });
 *
 * Super Admin (tenantId=null) → only sees system/platform data (tenantId IS NULL).
 * Tenant user → only sees their own tenant's data.
 */
export function tenantWhere(user: AuthUser | null): { tenantId: string | null } {
  return { tenantId: getTenantId(user) };
}

/**
 * Returns true if the user is a Super Admin (platform owner, tenantId = null).
 */
export function isPlatformAdmin(user: AuthUser | null): boolean {
  return !!user && user.role === 'Super Admin' && !user.tenantId;
}

/**
 * Returns the Prisma where clause for registers that a user is allowed to see.
 * Identical to `tenantWhere` — kept as a separate helper for readability at call sites.
 */
export function registerTenantWhere(user: AuthUser | null): { tenantId: string | null } {
  return tenantWhere(user);
}

// ────────────────────────────────────────────────────────────────
// Tenant CRUD helpers
// ────────────────────────────────────────────────────────────────

export async function getTenant(tenantId: string) {
  return db.tenant.findUnique({ where: { id: tenantId } });
}

export async function getTenantBySlug(slug: string) {
  return db.tenant.findUnique({ where: { slug } });
}

export async function createTenant(data: { name: string; slug: string; plan?: string }) {
  const plans: Record<string, { maxUsers: number; maxRecords: number }> = {
    starter: { maxUsers: 10, maxRecords: 10000 },
    pro: { maxUsers: 50, maxRecords: 100000 },
    enterprise: { maxUsers: 500, maxRecords: 1000000 },
  };
  const limits = plans[data.plan || 'starter'] || plans.starter;
  return db.tenant.create({
    data: { name: data.name, slug: data.slug, plan: data.plan || 'starter', maxUsers: limits.maxUsers, maxRecords: limits.maxRecords },
  });
}

/**
 * Hard-delete a tenant AND all of its private data (registers, records, users, etc.).
 * Platform/system data (tenantId IS NULL) is NEVER touched.
 * Returns counts of what was deleted.
 */
export async function purgeTenantData(tenantId: string) {
  // Defensive: never purge platform data (tenantId = null)
  if (!tenantId) throw new Error('Refusing to purge platform data (tenantId is null)');

  const [registers, records, savedViews, auditLogs, stockMovements, users] = await Promise.all([
    db.register.count({ where: { tenantId } }),
    db.record.count({ where: { tenantId } }),
    db.savedView.count({ where: { tenantId } }),
    db.auditLog.count({ where: { tenantId } }),
    db.stockMovement.count({ where: { tenantId } }),
    db.user.count({ where: { tenantId } }),
  ]);

  // Order matters: delete children before parents where FKs exist.
  await db.stockMovement.deleteMany({ where: { tenantId } });
  await db.auditLog.deleteMany({ where: { tenantId } });
  await db.savedView.deleteMany({ where: { tenantId } });
  // Records cascade-delete with their register (onDelete: Cascade), so deleting
  // the tenant's registers also removes their records.
  await db.record.deleteMany({ where: { tenantId } });
  await db.register.deleteMany({ where: { tenantId } });
  // Sessions belong to users — cascade on user delete.
  await db.session.deleteMany({ where: { user: { tenantId } } });
  await db.user.deleteMany({ where: { tenantId } });
  await db.tenant.delete({ where: { id: tenantId } });

  return { registers, records, savedViews, auditLogs, stockMovements, users };
}
