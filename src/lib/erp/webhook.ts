import { db } from '@/lib/db';
import { createHmac } from 'crypto';

export type WebhookEvent = 'record.created' | 'record.updated' | 'record.deleted' | 'stock.low' | 'wo.overdue' | 'ptw.pending' | 'user.created' | 'auth.login';

export async function triggerWebhooks(event: WebhookEvent, payload: any): Promise<void> {
  try {
    const webhooks = await db.webhookConfig?.findMany({ where: { isActive: true } }).catch(() => []) || [];
    if (webhooks.length === 0) return;
    await Promise.all(webhooks.filter((w: any) => {
      const events = JSON.parse(w.events || '[]');
      return events.includes(event) || events.includes('*');
    }).map((w: any) => sendWebhook(w, event, payload)));
  } catch (err) { console.error('[WEBHOOK]', err); }
}

async function sendWebhook(webhook: any, event: string, payload: any): Promise<void> {
  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-FMCore-Event': event, 'X-FMCore-Delivery': webhook.id };
  if (webhook.secret) headers['X-FMCore-Signature'] = createHmac('sha256', webhook.secret).update(body).digest('hex');
  try {
    const res = await fetch(webhook.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) });
    await db.webhookLog?.create({ data: { webhookId: webhook.id, event, payload: body, statusCode: res.status, success: res.ok, duration: 0 } }).catch(() => {});
  } catch (err: any) {
    await db.webhookLog?.create({ data: { webhookId: webhook.id, event, payload: body, statusCode: 0, response: err?.message || 'error', success: false, duration: 0 } }).catch(() => {});
  }
}

export const WEBHOOK_EVENTS = [
  { event: 'record.created', label: 'Record Created', description: 'When any new record is created' },
  { event: 'record.updated', label: 'Record Updated', description: 'When any record is updated' },
  { event: 'record.deleted', label: 'Record Deleted', description: 'When any record is deleted' },
  { event: 'stock.low', label: 'Low Stock Alert', description: 'When inventory drops below minimum' },
  { event: 'wo.overdue', label: 'WO Overdue', description: 'When a work order is overdue' },
  { event: 'ptw.pending', label: 'PTW Pending', description: 'When a permit-to-work is pending' },
  { event: 'user.created', label: 'User Created', description: 'When a new user is created' },
  { event: 'auth.login', label: 'User Login', description: 'When any user logs in' },
];
