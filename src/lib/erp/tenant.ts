import { db } from '@/lib/db';

export function getTenantId(user: any): string | null {
  return null; // Single-tenant mode — all data shared
}

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
