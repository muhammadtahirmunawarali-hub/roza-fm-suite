// FMCore ERP — Webhook Management API
// GET    /api/erp/webhooks     → list webhooks
// POST   /api/erp/webhooks     → create a webhook
// DELETE /api/erp/webhooks?id= → delete a webhook
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, forbidden, unauthorized, notFound } from '@/lib/erp/api-helpers';
import { getCurrentUser, hasPermission } from '@/lib/erp/auth';
import { randomBytes } from 'crypto';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (!hasPermission(user, 'settings', 'view')) return forbidden('Insufficient permissions');

  const webhooks = await db.webhookConfig.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { logs: true } } },
  });

  return NextResponse.json(webhooks.map(w => ({
    id: w.id,
    url: w.url,
    events: JSON.parse(w.events || '[]'),
    isActive: w.isActive,
    description: w.description,
    lastTriggeredAt: w.lastTriggeredAt?.toISOString() || null,
    lastResponseStatus: w.lastResponseStatus,
    failureCount: w.failureCount,
    logCount: w._count.logs,
    createdAt: w.createdAt.toISOString(),
  })));
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (!hasPermission(user, 'settings', 'edit')) return forbidden('Insufficient permissions');

  const body = await req.json();
  const { url, events, description } = body;

  if (!url) return badRequest('URL is required');
  if (!Array.isArray(events) || events.length === 0) return badRequest('At least one event is required');

  // Validate URL
  try { new URL(url); } catch { return badRequest('Invalid URL format'); }

  const secret = randomBytes(24).toString('hex');

  const webhook = await db.webhookConfig.create({
    data: {
      url,
      events: JSON.stringify(events),
      secret,
      description: description || null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'Created',
      module: 'Webhooks',
      summary: `Created webhook for ${url} (${events.length} events)`,
      newValue: JSON.stringify({ id: webhook.id, url, events }),
    },
  });

  return NextResponse.json({
    id: webhook.id,
    url: webhook.url,
    events,
    secret, // Return secret only once
    description: webhook.description,
    isActive: webhook.isActive,
    createdAt: webhook.createdAt.toISOString(),
  });
});

export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (!hasPermission(user, 'settings', 'edit')) return forbidden('Insufficient permissions');

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return badRequest('id parameter is required');

  const existing = await db.webhookConfig.findUnique({ where: { id } });
  if (!existing) return notFound('Webhook not found');

  await db.webhookConfig.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'Deleted',
      module: 'Webhooks',
      summary: `Deleted webhook for ${existing.url}`,
    },
  });

  return NextResponse.json({ ok: true });
});
