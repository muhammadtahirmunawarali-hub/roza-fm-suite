// FMCore ERP — Registers API
// GET  /api/erp/registers          → list all registers (grouped by category)
// POST /api/erp/registers          → create a new register
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Register, ColumnDef, RegisterCategory } from '@/lib/erp/types';
import { seedDatabase } from '@/lib/erp/seed';
import { apiHandler, badRequest } from '@/lib/erp/api-helpers';

export const GET = apiHandler(async () => {
  // Ensure DB is seeded at least once
  await seedDatabase(false);

  const rows = await db.register.findMany({
    where: { isDeleted: false },
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
  const body = await req.json();
  const { name, icon, category, color, description, columns } = body;

  if (!name) return badRequest('Name is required');
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return badRequest('At least one column is required');
  }

  const code = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  const existingCount = await db.register.count({ where: { code: { startsWith: code } } });
  const finalCode = existingCount === 0 ? code : `${code}_${existingCount + 1}`;

  const order = await db.register.count({ where: { category } });

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
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'Created',
        module: name,
        registerId: newReg.id,
        summary: `Created register "${name}" with ${columns.length} columns`,
        newValue: JSON.stringify({ name, columns }),
      },
    });

    return newReg;
  });

  return NextResponse.json({
    id: reg.id,
    code: reg.code,
    name: reg.name,
    icon: reg.icon,
    category: reg.category,
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
