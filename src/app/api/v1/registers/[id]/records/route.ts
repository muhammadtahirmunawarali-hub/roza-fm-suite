import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiKeyUser, hasApiKeyPermission } from '@/lib/erp/api-key-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiUser = await getApiKeyUser(req);
  if (!apiUser) return NextResponse.json({ ok: false, error: 'Invalid or missing API key' }, { status: 401 });
  if (!hasApiKeyPermission(apiUser, 'read')) return NextResponse.json({ ok: false, error: 'API key lacks read permission' }, { status: 403 });
  const { id } = await params;
  const register = await db.register.findUnique({ where: { id } });
  if (!register || register.isDeleted) return NextResponse.json({ ok: false, error: 'Register not found' }, { status: 404 });
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get('pageSize') || '25')));
  const search = url.searchParams.get('search') || '';
  const allRows = await db.record.findMany({ where: { registerId: id, isDeleted: false }, orderBy: { sequence: 'asc' } });
  let records = allRows.map((r) => ({ id: r.id, registerId: r.registerId, sequence: r.sequence, data: JSON.parse(r.data), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
  if (search) {
    const q = search.toLowerCase();
    records = records.filter((r) => Object.values(r.data).some((v) => v != null && String(v).toLowerCase().includes(q)));
  }
  const total = records.length;
  const start = (page - 1) * pageSize;
  return NextResponse.json({ ok: true, data: records.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}
