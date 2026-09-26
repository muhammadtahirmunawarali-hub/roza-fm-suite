// Roza FM Suite — Registers API
// GET  /api/erp/registers          → list all registers for the current tenant (grouped by category)
// POST /api/erp/registers          → create a new register (tenant-scoped)
//
// TENANT ISOLATION:
//   • Super Admin (tenantId = null) sees only platform/system registers (tenantId IS NULL).
//   • Tenant users see only their own tenant's registers.
//   • Custom registers created by a tenant user are tagged with their tenantId.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Register, ColumnDef, RegisterCategory } from '@/lib/erp/types';
import { seedDatabase } from '@/lib/erp/seed';
import { apiHandler, badRequest, forbidden } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere, getTenantId } from '@/lib/erp/tenant';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');

  // Ensure the platform DB is seeded at least once (only seeds tenantId = null system data)
  await seedDatabase(false);

  const rows = await db.register.findMany({
    where: { ...tenantWhere(user), isDeleted: false },
    orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }],
  });

  const registers: Register[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    icon: r.icon,
    category: r.category as RegisterCategory,
    color: r.color,
    description: r.description,
    columns: JSON.parse(r.columns) as ColumnDef[],
    isSystem: r.isSystem,
    isDeleted: r.isDeleted,
    order: r.order,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return NextResponse.json(registers);
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');

  const body = await req.json();
  const { name, icon, category, color, description, columns } = body;

  if (!name) return badRequest('Name is required');
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return badRequest('At least one column is required');
  }

  const tenantId = getTenantId(user);
  const code = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  // Scope the collision check to this tenant only (other tenants can have the same code)
  const existingCount = await db.register.count({ where: { code: { startsWith: code }, tenantId } });
  const finalCode = existingCount === 0 ? code : `${code}_${existingCount + 1}`;

  const order = await db.register.count({ where: { category, tenantId } });

  const reg = await db.$transaction(async (tx) => {
    const newReg = await tx.register.create({
      data: {
        code: finalCode,
        name,
        icon: icon || 'fa-table',
        category: category || 'operations',
        color: color || '#00D4AA',
        description: description || null,
        columns: JSON.stringify(columns),
        isSystem: false,
        order: order + 1,
        tenantId, // ← tenant-scoped
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'Created',
        module: name,
        registerId: newReg.id,
        summary: `Created register "${name}" with ${columns.length} columns`,
        newValue: JSON.stringify({ name, columns }),
        userId: user.id,
        tenantId,
      },
    });

    return newReg;
  });

  return NextResponse.json({
    id: reg.id,
    code: reg.code,
    name: reg.name,
    icon: reg.icon,
    category: reg.category as any,
    color: reg.color,
    description: reg.description,
    columns: JSON.parse(reg.columns) as ColumnDef[],
    isSystem: reg.isSystem,
    isDeleted: reg.isDeleted,
    order: reg.order,
    createdAt: reg.createdAt.toISOString(),
    updatedAt: reg.updatedAt.toISOString(),
  } satisfies Register);
});
