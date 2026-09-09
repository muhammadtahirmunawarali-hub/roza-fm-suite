import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, forbidden, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { createTenant } from '@/lib/erp/tenant';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin') return forbidden('Only Super Admin can manage tenants');
  const tenants = await db.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(tenants.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })));
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin') return forbidden('Only Super Admin can create tenants');
  const body = await req.json();
  const { name, slug, plan = 'starter' } = body;
  if (!name || !slug) return badRequest('Name and slug are required');
  const existing = await db.tenant.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ ok: false, error: 'Slug already exists' }, { status: 409 });
  const tenant = await createTenant({ name, slug, plan });
  await db.auditLog.create({ data: { userId: user.id, action: 'Created', module: 'Tenants', summary: `Created tenant "${name}" (plan: ${plan})`, newValue: JSON.stringify({ id: tenant.id, name, slug, plan }) } });
  return NextResponse.json({ ...tenant, createdAt: tenant.createdAt.toISOString(), updatedAt: tenant.updatedAt.toISOString() });
});
