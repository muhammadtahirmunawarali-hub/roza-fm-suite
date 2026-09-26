// Roza FM Suite — Duplicate Register API
// POST /api/erp/registers/[id]/duplicate → create a copy of an existing register
// Options: { copyRecords: boolean, newName?: string }
//
// TENANT ISOLATION:
//   • Source register is scoped by tenant — a tenant user cannot duplicate
//     another tenant's register by guessing its id (IDOR prevention).
//   • Code collision check is scoped to the caller's tenant — other tenants
//     can have the same code.
//   • New register, copied records, and audit log all get the caller's tenantId.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, notFound, forbidden, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere, getTenantId } from '@/lib/erp/tenant';

export const POST = apiHandler(async (req: NextRequest, { params }: any) => {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  // Only Super Admin, Administrator, or Manager can duplicate
  if (!['Super Admin', 'Administrator', 'Manager'].includes(user.role)) {
    return forbidden('Only admins can duplicate registers');
  }

  const tenantId = getTenantId(user);

  // IDOR fix: scope source register by tenant — use findFirst instead of findUnique
  const source = await db.register.findFirst({
    where: { id, ...tenantWhere(user) },
    include: { records: { where: { isDeleted: false, ...tenantWhere(user) } } },
  });
  if (!source || source.isDeleted) return notFound('Register not found');

  const body = await req.json().catch(() => ({}));
  const { copyRecords = false, newName } = body;

  // Generate unique code (scoped to this tenant — other tenants can have the same code)
  const baseCode = source.code;
  let suffix = 1;
  let newCode = `${baseCode}_copy`;
  while (await db.register.findFirst({ where: { code: newCode, ...tenantWhere(user) } })) {
    newCode = `${baseCode}_copy${++suffix}`;
  }

  const finalName = newName || `${source.name} (Copy)`;
  const order = await db.register.count({ where: { category: source.category, ...tenantWhere(user) } });

  const result = await db.$transaction(async (tx) => {
    // Create the duplicate register (tenant-scoped)
    const newReg = await tx.register.create({
      data: {
        code: newCode,
        name: finalName,
        icon: source.icon,
        category: source.category,
        color: source.color,
        description: source.description ? `${source.description} (copy)` : null,
        columns: source.columns, // copy column definitions
        isSystem: false, // duplicates are never system registers
        order: order + 1,
        tenantId, // ← tenant-scoped
      },
    });

    // Optionally copy records (also tenant-scoped)
    let copiedRecords = 0;
    if (copyRecords && source.records.length > 0) {
      for (const rec of source.records) {
        await tx.record.create({
          data: {
            registerId: newReg.id,
            sequence: rec.sequence,
            data: rec.data,
            createdBy: user.username,
            tenantId, // ← tenant-scoped
          },
        });
        copiedRecords++;
      }
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'Created',
        module: finalName,
        registerId: newReg.id,
        summary: `Duplicated register "${source.name}" → "${finalName}"${copyRecords ? ` with ${copiedRecords} records` : ' (structure only)'}`,
        newValue: JSON.stringify({ sourceId: id, newId: newReg.id, copyRecords, copiedRecords }),
        tenantId, // ← tenant-scoped
      },
    });

    return { newReg, copiedRecords };
  });

  return NextResponse.json({
    ok: true,
    message: `Register duplicated: "${source.name}" → "${finalName}"${copyRecords ? ` with ${result.copiedRecords} records` : ' (structure only)'}`,
    register: {
      id: result.newReg.id,
      code: result.newReg.code,
      name: result.newReg.name,
    },
  });
});
