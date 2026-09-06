// FMCore ERP — Backup / Restore
// GET  /api/erp/backup  → JSON export of all data
// POST /api/erp/backup  → { data } restore from JSON
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ColumnDef } from '@/lib/erp/types';

export async function GET() {
  const [registers, records, settings, notifications, auditLogs] = await Promise.all([
    db.register.findMany(),
    db.record.findMany(),
    db.setting.findMany(),
    db.notification.findMany(),
    db.auditLog.findMany({ take: 500, orderBy: { createdAt: 'desc' } }),
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
  const body = await req.json();
  const backup = body.data || body;

  if (!backup || !backup.registers) {
    return NextResponse.json({ ok: false, error: 'Invalid backup format' }, { status: 400 });
  }

  // Wipe current data
  await db.record.deleteMany();
  await db.register.deleteMany();
  await db.notification.deleteMany();
  await db.setting.deleteMany();
  await db.auditLog.deleteMany();

  // Restore registers
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
      },
    });
  }

  // Restore records
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
      },
    });
  }

  // Restore settings
  for (const s of backup.settings || []) {
    await db.setting.create({
      data: {
        key: s.key,
        value: s.value,
        category: s.category,
        updatedAt: new Date(s.updatedAt),
      },
    });
  }

  // Restore notifications
  for (const n of backup.notifications || []) {
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
