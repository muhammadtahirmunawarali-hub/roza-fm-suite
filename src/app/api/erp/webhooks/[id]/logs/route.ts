// FMCore ERP — Webhook Logs
// GET /api/erp/webhooks/[id]/logs → recent delivery logs for a webhook
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, unauthorized, forbidden, notFound } from '@/lib/erp/api-helpers';
import { getCurrentUser, hasPermission } from '@/lib/erp/auth';

export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (!hasPermission(user, 'settings', 'view')) return forbidden('Insufficient permissions');

  const { id } = await params;
  const webhook = await db.webhookConfig.findUnique({ where: { id } });
  if (!webhook) return notFound('Webhook not found');

  const logs = await db.webhookLog.findMany({
    where: { webhookId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(logs.map(l => ({
    id: l.id,
    event: l.event,
    payload: JSON.parse(l.payload),
    statusCode: l.statusCode,
    response: l.response,
    success: l.success,
    duration: l.duration,
    createdAt: l.createdAt.toISOString(),
  })));
});
