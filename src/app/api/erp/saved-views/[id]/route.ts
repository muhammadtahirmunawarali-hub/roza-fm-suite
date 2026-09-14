// Roza FM Suite — Saved View by ID (DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await db.savedView.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  await db.savedView.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      action: 'Deleted',
      module: 'Saved Views',
      summary: `Deleted saved view "${existing.name}"`,
    },
  });
  return NextResponse.json({ ok: true });
}
