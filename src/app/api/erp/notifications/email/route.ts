// FMCore ERP — Email Notification API
// POST /api/erp/notifications/email → send/queue an email notification
// GET  /api/erp/notifications/email → list queued emails
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, forbidden, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser, hasPermission } from '@/lib/erp/auth';

// In development (no SMTP configured), we log emails to console + store in audit log
// In production, this would integrate with Resend/SendGrid

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const { to, subject, message, type = 'notification' } = body;

  if (!to || !subject || !message) {
    return badRequest('to, subject, and message are required');
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return badRequest('Invalid email address');
  }

  // In production, this would call Resend/SendGrid:
  // await resend.emails.send({ from: 'noreply@fmcore.ae', to, subject, html: message });

  // For now: log to console + audit log
  console.log('[EMAIL QUEUED]', { to, subject, type, from: user.name });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'Email Queued',
      module: 'Notifications',
      summary: `Email queued to ${to}: ${subject}`,
      newValue: JSON.stringify({ to, subject, message: message.slice(0, 500), type }),
    },
  });

  return NextResponse.json({
    ok: true,
    message: 'Email queued successfully',
    note: 'In development mode, emails are logged. Configure Resend/SendGrid for production delivery.',
    queued: { to, subject, type, timestamp: new Date().toISOString() },
  });
});

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (!hasPermission(user, 'audit', 'view')) {
    return forbidden('Insufficient permissions to view email log');
  }

  // Return recent email entries from audit log
  const emails = await db.auditLog.findMany({
    where: { action: 'Email Queued' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    emails: emails.map((e) => ({
      id: e.id,
      to: e.newValue ? JSON.parse(e.newValue).to : 'unknown',
      subject: e.newValue ? JSON.parse(e.newValue).subject : 'unknown',
      type: e.newValue ? JSON.parse(e.newValue).type : 'notification',
      sentAt: e.createdAt.toISOString(),
      sentBy: e.userId,
    })),
    count: emails.length,
  });
});
