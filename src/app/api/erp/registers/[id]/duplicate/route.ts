// Roza FM Suite — Duplicate Register API
// POST /api/erp/registers/[id]/duplicate → create a copy of an existing register
// Options: { copyRecords: boolean, newName?: string }
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, notFound, forbidden, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';

export const POST = apiHandler(async (req: NextRequest, { params }: any) => {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  // Only Super Admin, Administrator, or Manager can duplicate
  if (!['Super Admin', 'Administrator', 'Manager'].includes(user.role)) {
    return forbidden('Only admins can duplicate registers');
  }

  const source = await db.register.findUnique({ where: { id }, include: { records: { where: { isDeleted: false } } } });
  if (!source || source.isDeleted) return notFound('Register not found');

  const body = await req.json().catch(() => ({}));
  const { copyRecords = false, newName } = body;

  // Generate unique code
  const baseCode = source.code;
  let suffix = 1;
  let newCode = `${baseCode}_copy`;
  while (await db.register.findFirst({ where: { code: newCode } })) {
    newCode = `${baseCode}_copy${++suffix}`;
  }

  const finalName = newName || `${source.name} (Copy)`;
  const order = await db.register.count({ where: { category: source.category } });

  const result = await db.$transaction(async (tx) => {
    // Create the duplicate register
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
      },
    });

    // Optionally copy records
    let copiedRecords = 0;
    if (copyRecords && source.records.length > 0) {
      for (const rec of source.records) {
        await tx.record.create({
          data: {
            registerId: newReg.id,
            sequence: rec.sequence,
            data: rec.data,
            createdBy: user.username,
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
