// FMCore ERP — Records API (paginated, searchable, sortable, filterable)
// GET  /api/erp/registers/[id]/records?page=1&pageSize=25&search=&sortField=&sortDir=asc&f_Status=
// POST /api/erp/registers/[id]/records   { data: {...} }
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { RecordData, ColumnDef } from '@/lib/erp/types';

function serialize(r: any): RecordData {
  return {
    id: r.id,
    registerId: r.registerId,
    sequence: r.sequence,
    data: JSON.parse(r.data),
    isDeleted: r.isDeleted,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    createdBy: r.createdBy,
    updatedBy: r.updatedBy,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const register = await db.register.findUnique({ where: { id } });
  if (!register || register.isDeleted) {
    return NextResponse.json({ ok: false, error: 'Register not found' }, { status: 404 });
  }

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(500, Math.max(5, parseInt(url.searchParams.get('pageSize') || '25')));
  const search = url.searchParams.get('search') || '';
  const sortField = url.searchParams.get('sortField') || '';
  const sortDir = (url.searchParams.get('sortDir') || 'asc') as 'asc' | 'desc';

  // Collect filters: f_<FieldName>
  const filters: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key.startsWith('f_')) filters[key.slice(2)] = value;
  });

  const columns = JSON.parse(register.columns) as ColumnDef[];

  // Fetch all non-deleted records (SQLite doesn't have great JSON querying — we filter in JS)
  const allRows = await db.record.findMany({
    where: { registerId: id, isDeleted: false },
    orderBy: { sequence: 'asc' },
  });

  let records = allRows.map(serialize);

  // Apply search
  if (search.trim()) {
    const q = search.toLowerCase();
    records = records.filter((r) =>
      Object.values(r.data).some((v) => {
        if (v === null || v === undefined) return false;
        if (Array.isArray(v)) return v.some((x) => String(x).toLowerCase().includes(q));
        return String(v).toLowerCase().includes(q);
      }),
    );
  }

  // Apply filters
  for (const [field, value] of Object.entries(filters)) {
    if (!value) continue;
    records = records.filter((r) => {
      const v = r.data[field];
      if (v === undefined || v === null) return false;
      if (Array.isArray(v)) return v.includes(value);
      return String(v) === value;
    });
  }

  // Apply sort
  if (sortField) {
    const col = columns.find((c) => c.name === sortField);
    records.sort((a, b) => {
      const av = a.data[sortField];
      const bv = b.data[sortField];
      let cmp = 0;
      if (av === undefined || av === null || av === '') return 1;
      if (bv === undefined || bv === null || bv === '') return -1;
      if (col && (col.type === 'number' || col.type === 'currency' || col.type === 'percentage' || col.type === 'rating')) {
        cmp = Number(av) - Number(bv);
      } else if (col && (col.type === 'date' || col.type === 'datetime')) {
        cmp = new Date(av).getTime() - new Date(bv).getTime();
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }

  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = records.slice(start, start + pageSize);

  return NextResponse.json({
    data: paged,
    total,
    page,
    pageSize,
    totalPages,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const register = await db.register.findUnique({ where: { id } });
  if (!register || register.isDeleted) {
    return NextResponse.json({ ok: false, error: 'Register not found' }, { status: 404 });
  }
  const body = await req.json();
  const data: Record<string, any> = body.data || {};

  // Auto-assign sequence
  const lastRecord = await db.record.findFirst({
    where: { registerId: id },
    orderBy: { sequence: 'desc' },
  });
  const sequence = (lastRecord?.sequence || 0) + 1;

  // Auto-fill auto_increment columns with formatted number
  const columns = JSON.parse(register.columns) as ColumnDef[];
  columns.forEach((col) => {
    if (col.type === 'auto_increment' && !data[col.name]) {
      data[col.name] = sequence;
    }
  });

  const r = await db.record.create({
    data: {
      registerId: id,
      sequence,
      data: JSON.stringify(data),
      createdBy: 'admin',
    },
  });

  await db.auditLog.create({
    data: {
      action: 'Created',
      module: register.name,
      registerId: id,
      recordId: r.id,
      summary: `Created record #${sequence} in "${register.name}"`,
      newValue: JSON.stringify(data),
    },
  });

  return NextResponse.json(serialize(r));
}
