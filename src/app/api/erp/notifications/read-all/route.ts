import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  await db.notification.updateMany({ where: { isRead: false }, data: { isRead: true, readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
