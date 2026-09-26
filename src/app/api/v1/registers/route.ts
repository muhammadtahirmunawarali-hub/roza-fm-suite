// Roza FM Suite — Public REST API: Registers list
// GET /api/v1/registers → list all registers accessible to this API key
//
// TENANT ISOLATION (API-key scoped):
//   • Platform-level API key (tenantId = null) → sees only platform/system registers (tenantId IS NULL).
//   • Tenant-scoped API key (tenantId = "<id>") → sees only that tenant's registers.
//   • Uses the api key's `tenantId` field (not a session cookie).
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiKeyUser, hasApiKeyPermission } from '@/lib/erp/api-key-auth';
import type { Register, ColumnDef, RegisterCategory } from '@/lib/erp/types';

export async function GET(req: NextRequest) {
  const apiUser = await getApiKeyUser(req);
  if (!apiUser) return NextResponse.json({ ok: false, error: 'Invalid or missing API key. Provide X-API-Key header.' }, { status: 401 });
  if (!hasApiKeyPermission(apiUser, 'read')) return NextResponse.json({ ok: false, error: 'API key lacks read permission' }, { status: 403 });
  // Scope by the api key's tenantId (null = platform-level key → only platform registers)
  const rows = await db.register.findMany({ where: { tenantId: apiUser.tenantId, isDeleted: false }, orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }] });
  const registers: Register[] = rows.map((r) => ({ id: r.id, code: r.code, name: r.name, icon: r.icon, category: r.category as RegisterCategory, color: r.color, description: r.description, columns: JSON.parse(r.columns) as ColumnDef[], isSystem: r.isSystem, isDeleted: r.isDeleted, order: r.order, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
  return NextResponse.json({ ok: true, data: registers, count: registers.length });
}
