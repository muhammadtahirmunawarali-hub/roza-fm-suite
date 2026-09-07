// FMCore ERP — Records API (paginated, searchable, sortable, filterable)
// GET  /api/erp/registers/[id]/records?page=1&pageSize=25&search=&sortField=&sortDir=asc&f_Status=
// POST /api/erp/registers/[id]/records   { data: {...} }
// Server-side permission checks: POST requires 'create' permission.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { RecordData, ColumnDef } from '@/lib/erp/types';
import {
  apiHandler,
  requirePermission,
  validateRecordData,
  badRequest,
  notFound,
} from '@/lib/erp/api-helpers';

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

export const GET = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const register = await db.register.findUnique({ where: { id } });
  if (!register || register.isDeleted) {
    return notFound('Register not found');
  }

  const nextReq = req as NextRequest;
  const url = nextReq.nextUrl;
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
});

export const POST = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const register = await db.register.findUnique({ where: { id } });
  if (!register || register.isDeleted) {
    return notFound('Register not found');
  }

  // Server-side permission check
  const [user, permError] = await requirePermission(req, register.code, 'create');
  if (permError) return permError;

  const body = await req.json();
  const data: Record<string, any> = body.data || {};

  // Validate the data against the register's columns
  const columns = JSON.parse(register.columns) as ColumnDef[];
  const validationErrors = validateRecordData(data, columns);
  if (validationErrors.length > 0) {
    return badRequest('Validation failed', validationErrors);
  }

  // Auto-assign sequence
  const lastRecord = await db.record.findFirst({
    where: { registerId: id },
    orderBy: { sequence: 'desc' },
  });
  const sequence = (lastRecord?.sequence || 0) + 1;

  // Auto-fill auto_increment columns with formatted number
  columns.forEach((col) => {
    if (col.type === 'auto_increment' && !data[col.name]) {
      data[col.name] = sequence;
    }
  });

  // Create record + audit log atomically (transaction)
  const r = await db.$transaction(async (tx) => {
    const newRecord = await tx.record.create({
      data: {
        registerId: id,
        sequence,
        data: JSON.stringify(data),
        createdBy: user?.username || 'system',
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user?.id || null,
        action: 'Created',
        module: register.name,
        registerId: id,
        recordId: newRecord.id,
        summary: `Created record #${sequence} in "${register.name}"`,
        newValue: JSON.stringify(data),
      },
    });
    return newRecord;
  });

  return NextResponse.json(serialize(r));
});
