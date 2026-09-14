// FMCore ERP — Notifications API
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler } from '@/lib/erp/api-helpers';

export const GET = apiHandler(async () => {
  // Note: seedDatabase is NOT called here — it's called on /api/erp/auth/me (app startup)
  // to avoid running 4+ DB queries on every 30s notification poll
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
});
