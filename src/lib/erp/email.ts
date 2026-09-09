import { db } from '@/lib/db';

export interface EmailPayload {
  to: string;
  subject: string;
  message: string;
  type?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; message: string }> {
  const { to, subject, message, type = 'notification' } = payload;
  if (!to || !subject || !message) return { ok: false, message: 'Missing required fields' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, message: 'Invalid email address' };
  console.log('[EMAIL]', { to, subject, type, preview: message.slice(0, 100) });
  await db.auditLog.create({ data: { action: 'Email Queued', module: 'Notifications', summary: `Email to ${to}: ${subject}`, newValue: JSON.stringify({ to, subject, message: message.slice(0, 1000), type }) } }).catch(() => {});
  return { ok: true, message: 'Email queued (development mode)' };
}

export async function isEmailEnabled(type: string): Promise<boolean> {
  const setting = await db.setting.findUnique({ where: { key: `email.on_${type}` } });
  if (!setting) return ['low_stock', 'wo_overdue', 'ptw_pending', 'incident'].includes(type);
  return setting.value === 'true';
}
