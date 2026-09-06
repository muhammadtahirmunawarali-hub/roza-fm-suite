// FMCore ERP — Related Records API
// GET /api/erp/registers/[id]/records/[recordId]/related
// Finds records in OTHER registers that reference the same entity (employee, building, asset, etc.)
// For example, if viewing a Work Order assigned to "Ahmed Ali" on "Building A",
// this returns all records in other registers that also mention "Ahmed Ali" or "Building A".
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ColumnDef } from '@/lib/erp/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;

  const register = await db.register.findUnique({ where: { id } });
  if (!register || register.isDeleted) {
    return NextResponse.json({ ok: false, error: 'Register not found' }, { status: 404 });
  }

  const record = await db.record.findUnique({ where: { id: recordId, registerId: id } });
  if (!record || record.isDeleted) {
    return NextResponse.json({ ok: false, error: 'Record not found' }, { status: 404 });
  }

  const recordData = JSON.parse(record.data);
  const columns = JSON.parse(register.columns) as ColumnDef[];

  // Extract reference values from the current record (employee, building, asset, equipment, vendor, department)
  const referenceValues: { type: string; value: string; columnName: string }[] = [];
  columns.forEach((col) => {
    if (['employee', 'building', 'asset', 'equipment', 'vendor', 'department'].includes(col.type)) {
      const val = recordData[col.name];
      if (val) {
        referenceValues.push({ type: col.type, value: String(val), columnName: col.name });
      }
    }
  });

  if (referenceValues.length === 0) {
    return NextResponse.json({ ok: true, related: [] });
  }

  // Find all other registers
  const otherRegisters = await db.register.findMany({
    where: { id: { not: id }, isDeleted: false },
    include: { records: { where: { isDeleted: false } } },
  });

  const relatedGroups: {
    registerId: string;
    registerName: string;
    registerCode: string;
    registerIcon: string;
    registerColor: string;
    records: {
      id: string;
      sequence: number;
      data: Record<string, any>;
      matchedOn: string;
      matchedColumn: string;
      createdAt: string;
    }[];
  }[] = [];

  for (const reg of otherRegisters) {
    const regColumns = JSON.parse(reg.columns) as ColumnDef[];
    const matchingCols = regColumns.filter((c) =>
      ['employee', 'building', 'asset', 'equipment', 'vendor', 'department', 'text'].includes(c.type),
    );
    if (matchingCols.length === 0) continue;

    const matchedRecords: any[] = [];

    for (const rec of reg.records) {
      const recData = JSON.parse(rec.data);
      let matched = false;
      let matchedOn = '';
      let matchedColumn = '';

      for (const ref of referenceValues) {
        for (const col of matchingCols) {
          const val = recData[col.name];
          if (val && String(val).toLowerCase() === ref.value.toLowerCase()) {
            matched = true;
            matchedOn = ref.value;
            matchedColumn = col.name;
            break;
          }
        }
        if (matched) break;
      }

      if (matched) {
        matchedRecords.push({
          id: rec.id,
          sequence: rec.sequence,
          data: recData,
          matchedOn,
          matchedColumn,
          createdAt: rec.createdAt.toISOString(),
        });
      }
    }

    if (matchedRecords.length > 0) {
      relatedGroups.push({
        registerId: reg.id,
        registerName: reg.name,
        registerCode: reg.code,
        registerIcon: reg.icon,
        registerColor: reg.color,
        records: matchedRecords.slice(0, 5), // limit to 5 per register
      });
    }
  }

  return NextResponse.json({ ok: true, related: relatedGroups });
}
