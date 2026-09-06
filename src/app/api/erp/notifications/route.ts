// FMCore ERP — Notifications API
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { seedDatabase } from '@/lib/erp/seed';

export async function GET() {
  await seedDatabase(false);
  const rows = await db.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json(rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    severity: n.severity,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() || null,
  })));
}
