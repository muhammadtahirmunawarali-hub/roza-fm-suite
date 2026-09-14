// Roza FM Suite — Bulk record creation (for CSV import)
// POST /api/erp/registers/[id]/records/bulk  { records: [{...}, {...}] }
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ColumnDef } from '@/lib/erp/types';
import { apiHandler, badRequest, notFound } from '@/lib/erp/api-helpers';

export const POST = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const register = await db.register.findUnique({ where: { id } });
  if (!register || register.isDeleted) {
    return notFound('Register not found');
  }
  const body = await req.json();
  const records: Record<string, any>[] = body.records || [];
  if (!Array.isArray(records) || records.length === 0) {
    return badRequest('No records to import');
  }

  const columns = JSON.parse(register.columns) as ColumnDef[];
  const lastRecord = await db.record.findFirst({
    where: { registerId: id },
    orderBy: { sequence: 'desc' },
  });
  let sequence = lastRecord?.sequence || 0;

  const created: any[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < records.length; i++) {
    const data = { ...records[i] };
    sequence++;
    columns.forEach((col) => {
      if (col.type === 'auto_increment' && !data[col.name]) {
        data[col.name] = sequence;
      }
    });
    try {
      const r = await db.record.create({
        data: {
          registerId: id,
          sequence,
          data: JSON.stringify(data),
          createdBy: 'import',
        },
      });
      created.push(r);
    } catch (e: any) {
      errors.push({ row: i + 1, error: e.message });
    }
  }

  await db.auditLog.create({
    data: {
      action: 'Imported',
      module: register.name,
      registerId: id,
      summary: `Bulk imported ${created.length} record(s) into "${register.name}"${errors.length ? ` (${errors.length} failed)` : ''}`,
      newValue: JSON.stringify({ count: created.length, errors: errors.slice(0, 10) }),
    },
  });

  return NextResponse.json({
    ok: true,
    imported: created.length,
    failed: errors.length,
    errors: errors.slice(0, 20),
  });
});
