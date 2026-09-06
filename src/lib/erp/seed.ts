// FMCore ERP — Server-side seed helper
// Seeds the database with all the FMCore registers + sample records from sample-data.ts
import { db } from '@/lib/db';
import { REGISTER_SEEDS, MASTER_DATA } from './sample-data';
import type { ColumnDef } from './types';

export async function seedDatabase(force = false) {
  // Check if already seeded
  const existing = await db.register.count();
  if (existing > 0 && !force) {
    return { seeded: false, reason: 'already_seeded', count: existing };
  }

  if (force) {
    // Wipe all registers + records (cascade)
    await db.record.deleteMany();
    await db.register.deleteMany();
    await db.notification.deleteMany();
    await db.auditLog.deleteMany();
  }

  let totalRegisters = 0;
  let totalRecords = 0;

  for (let i = 0; i < REGISTER_SEEDS.length; i++) {
    const seed = REGISTER_SEEDS[i];
    const register = await db.register.create({
      data: {
        code: seed.code,
        name: seed.name,
        icon: seed.icon,
        category: seed.category,
        color: seed.color,
        description: seed.description || null,
        columns: JSON.stringify(seed.columns),
        isSystem: true,
        order: i + 1,
      },
    });
    totalRegisters++;

    for (let r = 0; r < seed.records.length; r++) {
      const data = seed.records[r];
      await db.record.create({
        data: {
          registerId: register.id,
          sequence: r + 1,
          data: JSON.stringify(data),
          createdBy: 'system',
        },
      });
      totalRecords++;
    }
  }

  // Default settings
  const defaultSettings: { key: string; value: string; category: string }[] = [
    { key: 'theme', value: 'dark', category: 'appearance' },
    { key: 'currency', value: 'AED', category: 'currency' },
    { key: 'company.name', value: 'FMCore Facilities Management', category: 'company' },
    { key: 'company.address', value: 'Sheikh Zayed Road, Dubai, UAE', category: 'company' },
    { key: 'company.phone', value: '+971-4-XXX-XXXX', category: 'company' },
    { key: 'company.email', value: 'info@fmcore.ae', category: 'company' },
    { key: 'company.tax_number', value: 'TRN100-XXX-XXX', category: 'company' },
    { key: 'company.currency', value: 'AED', category: 'company' },
    { key: 'company.country', value: 'United Arab Emirates', category: 'company' },
    { key: 'company.fiscal_year', value: 'Jan-Dec', category: 'company' },
    { key: 'date_format', value: 'DD/MM/YYYY', category: 'general' },
    { key: 'app_version', value: '1.0.0', category: 'general' },
    { key: 'schema_version', value: '1', category: 'general' },
  ];

  for (const s of defaultSettings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  // Default notifications derived from sample data
  const notifications = [
    { type: 'low_stock', title: 'Low Stock Alert', message: 'HEPA Filter 610x610x292 below minimum level (4/8)', severity: 'warning', link: '/?tab=inventory' },
    { type: 'low_stock', title: 'Low Stock Alert', message: 'Fire Extinguisher ABC 9kg below minimum level (6/10)', severity: 'warning', link: '/?tab=inventory' },
    { type: 'work_order_overdue', title: 'Work Order Open', message: 'WO-0002 Elevator-03 door fault — Critical priority', severity: 'critical', link: '/?tab=workorders' },
    { type: 'maintenance_due', title: 'PM Due', message: 'Chiller CH-01 monthly PM due 2025-02-15', severity: 'warning', link: '/?tab=pm' },
    { type: 'pending_approval', title: 'PTW Pending Approval', message: 'PTW-0002 Welding at Block D Roof awaiting approval', severity: 'info', link: '/?tab=ptw' },
    { type: 'system', title: 'System Initialized', message: 'FMCore ERP initialized with sample data', severity: 'success', link: '/' },
  ];

  for (const n of notifications) {
    await db.notification.create({ data: n });
  }

  // Audit log entry
  await db.auditLog.create({
    data: {
      action: 'Imported',
      module: 'System',
      summary: `Database seeded with ${totalRegisters} registers and ${totalRecords} sample records`,
      oldValue: null,
      newValue: JSON.stringify({ registers: totalRegisters, records: totalRecords }),
    },
  });

  return { seeded: true, registers: totalRegisters, records: totalRecords };
}

export async function resetDatabase() {
  await db.record.deleteMany();
  await db.register.deleteMany();
  await db.notification.deleteMany();
  await db.auditLog.deleteMany();
  await db.setting.deleteMany({ where: { category: { not: 'general' } } });
  return { reset: true };
}

export async function getStats() {
  const [registers, records, auditLogs, notifications, settings, unreadNotifs] = await Promise.all([
    db.register.count({ where: { isDeleted: false } }),
    db.record.count({ where: { isDeleted: false } }),
    db.auditLog.count(),
    db.notification.count(),
    db.setting.count(),
    db.notification.count({ where: { isRead: false } }),
  ]);
  return { registers, records, auditLogs, notifications, settings, unreadNotifs };
}

export { MASTER_DATA };
