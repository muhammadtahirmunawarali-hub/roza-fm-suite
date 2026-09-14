// Roza FM Suite — Audit Logs API
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(200, Math.max(5, parseInt(url.searchParams.get('pageSize') || '25')));
  const moduleFilter = url.searchParams.get('module') || '';

  const where = moduleFilter ? { module: { contains: moduleFilter } } : {};
  const total = await db.auditLog.count({ where });
  const rows = await db.auditLog.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });

  return NextResponse.json({
    data: rows.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user?.name || (l.userId ? 'Unknown' : 'System'),
      action: l.action,
      module: l.module,
      registerId: l.registerId,
      recordId: l.recordId,
      summary: l.summary,
      oldValue: l.oldValue ? JSON.parse(l.oldValue) : null,
      newValue: l.newValue ? JSON.parse(l.newValue) : null,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
