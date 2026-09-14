// Roza FM Suite — Settings API
// GET  /api/erp/settings          → list all settings
// POST /api/erp/settings         → set one setting { key, value, category }
// PUT  /api/erp/settings         → bulk set [{ key, value, category? }]
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest } from '@/lib/erp/api-helpers';

export const GET = apiHandler(async () => {
  const rows = await db.setting.findMany({ orderBy: { category: 'asc' } });
  return NextResponse.json(rows.map((s) => ({ ...s, updatedAt: s.updatedAt.toISOString() })));
});

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { key, value, category = 'general' } = body;
  if (!key) return badRequest('Key is required');

  const s = await db.setting.upsert({
    where: { key },
    update: { value: String(value), category },
    create: { key, value: String(value), category },
  });
  await db.auditLog.create({
    data: {
      action: 'Updated',
      module: 'Settings',
      summary: `Updated setting "${key}" = ${String(value).slice(0, 80)}`,
      newValue: JSON.stringify({ key, value, category }),
    },
  });
  return NextResponse.json({ ...s, updatedAt: s.updatedAt.toISOString() });
});

export const PUT = apiHandler(async (req) => {
  const body = await req.json();
  const items: { key: string; value: string; category?: string }[] = body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return badRequest('items array (non-empty) is required');
  }

  // Validate the request body structure: each item must have a non-empty key and value
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return badRequest('Each item must be an object');
    }
    if (!item.key || typeof item.key !== 'string') {
      return badRequest('Each item must have a non-empty key');
    }
    if (item.value === undefined || item.value === null) {
      return badRequest(`Item "${item.key}" must have a value`);
    }
    if (item.category !== undefined && typeof item.category !== 'string') {
      return badRequest(`Item "${item.key}" category must be a string`);
    }
  }

  for (const item of items) {
    await db.setting.upsert({
      where: { key: item.key },
      update: { value: String(item.value), category: item.category || 'general' },
      create: { key: item.key, value: String(item.value), category: item.category || 'general' },
    });
  }
  await db.auditLog.create({
    data: {
      action: 'Updated',
      module: 'Settings',
      summary: `Bulk updated ${items.length} settings`,
    },
  });
  return NextResponse.json({ ok: true, count: items.length });
});
