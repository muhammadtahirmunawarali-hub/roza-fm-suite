// FMCore ERP — Settings API
// GET  /api/erp/settings          → list all settings
// POST /api/erp/settings         → set one setting { key, value, category }
// PUT  /api/erp/settings         → bulk set [{ key, value, category? }]
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const rows = await db.setting.findMany({ orderBy: { category: 'asc' } });
  return NextResponse.json(rows.map((s) => ({ ...s, updatedAt: s.updatedAt.toISOString() })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { key, value, category = 'general' } = body;
  if (!key) return NextResponse.json({ ok: false, error: 'Key is required' }, { status: 400 });

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
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const items: { key: string; value: string; category?: string }[] = body.items;
  if (!Array.isArray(items)) return NextResponse.json({ ok: false, error: 'items array required' }, { status: 400 });

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
}
