import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
