import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiKeyUser, hasApiKeyPermission } from '@/lib/erp/api-key-auth';
import type { Register, ColumnDef, RegisterCategory } from '@/lib/erp/types';

export async function GET(req: NextRequest) {
  const apiUser = await getApiKeyUser(req);
  if (!apiUser) return NextResponse.json({ ok: false, error: 'Invalid or missing API key. Provide X-API-Key header.' }, { status: 401 });
  if (!hasApiKeyPermission(apiUser, 'read')) return NextResponse.json({ ok: false, error: 'API key lacks read permission' }, { status: 403 });
  const rows = await db.register.findMany({ where: { isDeleted: false }, orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }] });
  const registers: Register[] = rows.map((r) => ({ id: r.id, code: r.code, name: r.name, icon: r.icon, category: r.category as RegisterCategory, color: r.color, description: r.description, columns: JSON.parse(r.columns) as ColumnDef[], isSystem: r.isSystem, isDeleted: r.isDeleted, order: r.order, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
  return NextResponse.json({ ok: true, data: registers, count: registers.length });
}
