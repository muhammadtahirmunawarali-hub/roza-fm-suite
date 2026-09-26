// Roza FM Suite — Backup / Restore
// GET  /api/erp/backup  → JSON export of all data for the current tenant
// POST /api/erp/backup  → { data } restore from JSON (scoped to current tenant)
//
// TENANT ISOLATION (CRITICAL):
//   • GET  exports only the current tenant's registers/records/auditLogs.
//     Settings and Notifications have NO tenantId column (global resources) and are
//     still exported for visibility, but cannot be scoped by tenant.
//   • POST only deletes the current tenant's records + registers (was previously a
//     global wipe — would have destroyed ALL tenants' data). Notifications, settings,
//     and audit logs are NOT wiped on restore.
//   • Restored registers/records have their tenantId forced to the current user's
//     tenantId to prevent cross-tenant data injection via a malicious backup file.
//   • Super Admin (tenantId = null) exports/restores only platform/system data.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ColumnDef } from '@/lib/erp/types';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere, getTenantId } from '@/lib/erp/tenant';
import { forbidden } from '@/lib/erp/api-helpers';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');

  const tenantFilter = tenantWhere(user);
  const [registers, records, settings, notifications, auditLogs] = await Promise.all([
    db.register.findMany({ where: tenantFilter }),
    db.record.findMany({ where: tenantFilter }),
    db.setting.findMany(),
    db.notification.findMany(),
    db.auditLog.findMany({ where: tenantFilter, take: 500, orderBy: { createdAt: 'desc' } }),
  ]);

  const backup = {
    schemaVersion: 1,
    appVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      registers: registers.map((r) => ({
        ...r,
        columns: JSON.parse(r.columns),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      records: records.map((r) => ({
        ...r,
        data: JSON.parse(r.data),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      settings: settings.map((s) => ({ ...s, updatedAt: s.updatedAt.toISOString() })),
      notifications: notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt?.toISOString() || null,
      })),
      auditLogs: auditLogs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    },
  };

  return NextResponse.json(backup);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');

  const body = await req.json();
  const backup = body.data || body;

  if (!backup || !backup.registers) {
    return NextResponse.json({ ok: false, error: 'Invalid backup format' }, { status: 400 });
  }

  const tenantId = getTenantId(user);

  // Wipe ONLY the current tenant's records + registers (was a global wipe — bug fix).
  // Notifications, settings, and audit logs are NOT wiped (they are global or
  // historical; wiping would destroy other tenants' data or audit history).
  await db.record.deleteMany({ where: tenantWhere(user) });
  await db.register.deleteMany({ where: tenantWhere(user) });

  // Restore registers — force tenantId to the current user's tenant to prevent
  // cross-tenant data injection via a malicious backup payload.
  for (const r of backup.registers) {
    await db.register.create({
      data: {
        id: r.id,
        code: r.code,
        name: r.name,
        icon: r.icon,
        category: r.category,
        color: r.color,
        description: r.description || null,
        columns: JSON.stringify(r.columns || []),
        isSystem: r.isSystem ?? false,
        isDeleted: r.isDeleted ?? false,
        order: r.order ?? 0,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        tenantId,
      },
    });
  }

  // Restore records — force tenantId to the current user's tenant.
  for (const r of backup.records) {
    await db.record.create({
      data: {
        id: r.id,
        registerId: r.registerId,
        sequence: r.sequence,
        data: JSON.stringify(r.data || {}),
        isDeleted: r.isDeleted ?? false,
        createdBy: r.createdBy || null,
        updatedBy: r.updatedBy || null,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        tenantId,
      },
    });
  }

  // Restore settings — upsert (key is the unique PK; we no longer wipe global settings).
  for (const s of backup.settings || []) {
    await db.setting.upsert({
      where: { key: s.key },
      create: {
        key: s.key,
        value: s.value,
        category: s.category,
        updatedAt: new Date(s.updatedAt),
      },
      update: {
        value: s.value,
        category: s.category,
        updatedAt: new Date(s.updatedAt),
      },
    });
  }

  // Restore notifications — best-effort create; skip on duplicate id conflicts
  // (the original notification may still exist since we no longer wipe global data).
  for (const n of backup.notifications || []) {
    try {
      await db.notification.create({
        data: {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          severity: n.severity,
          link: n.link || null,
          isRead: n.isRead,
          createdAt: new Date(n.createdAt),
          readAt: n.readAt ? new Date(n.readAt) : null,
        },
      });
    } catch {
      // Skip duplicates (notification id already exists)
    }
  }

  await db.auditLog.create({
    data: {
      action: 'Imported',
      module: 'Backup',
      summary: `Restored backup from ${backup.exportedAt || 'unknown date'}`,
      newValue: JSON.stringify({
        registers: backup.registers.length,
        records: backup.records.length,
        settings: backup.settings?.length || 0,
        notifications: backup.notifications?.length || 0,
      }),
      tenantId,
    },
  });

  return NextResponse.json({
    ok: true,
    registers: backup.registers.length,
    records: backup.records.length,
    settings: backup.settings?.length || 0,
    notifications: backup.notifications?.length || 0,
  });
}
