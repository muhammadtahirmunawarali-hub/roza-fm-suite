// FMCore ERP — Webhook Events (shared between client & server)
// This file is client-safe — no Prisma imports.
// Keep in sync with src/lib/erp/webhook.ts

export type WebhookEvent =
  | 'record.created'
  | 'record.updated'
  | 'record.deleted'
  | 'stock.low'
  | 'wo.overdue'
  | 'ptw.pending'
  | 'user.created'
  | 'user.deleted'
  | 'auth.login';

/**
 * Get available webhook events for the UI.
 */
export const WEBHOOK_EVENTS: { event: WebhookEvent; label: string; description: string }[] = [
  { event: 'record.created', label: 'Record Created', description: 'When any new record is created' },
  { event: 'record.updated', label: 'Record Updated', description: 'When any record is updated' },
  { event: 'record.deleted', label: 'Record Deleted', description: 'When any record is deleted' },
  { event: 'stock.low', label: 'Low Stock Alert', description: 'When inventory drops below minimum' },
  { event: 'wo.overdue', label: 'WO Overdue', description: 'When a work order is overdue' },
  { event: 'ptw.pending', label: 'PTW Pending', description: 'When a permit-to-work is pending approval' },
  { event: 'user.created', label: 'User Created', description: 'When a new user is created' },
  { event: 'user.deleted', label: 'User Deleted', description: 'When a user is deleted' },
  { event: 'auth.login', label: 'User Login', description: 'When any user logs in' },
];
