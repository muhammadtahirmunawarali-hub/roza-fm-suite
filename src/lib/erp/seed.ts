// Roza FM Suite — Server-side seed helper
// Seeds the database with all the FMCore registers + sample records from sample-data.ts
import { db } from '@/lib/db';
import { REGISTER_SEEDS, MASTER_DATA } from './sample-data';
import type { ColumnDef } from './types';

// ---------- Role / Permission matrix ----------
export const ROLES = [
  { id: 'Super Admin',     name: 'Super Admin',     description: 'Full system access including user management', color: '#DC2626', level: 100 },
  { id: 'Administrator',   name: 'Administrator',   description: 'Full access to all modules except user management', color: '#7C3AED', level: 90 },
  { id: 'Manager',         name: 'Manager',         description: 'Manage records, approve workflows, view reports', color: '#2563EB', level: 70 },
  { id: 'Client Staff',    name: 'Client Staff',    description: 'Client representative — view + comment on project records', color: '#0EA5E9', level: 55 },
  { id: 'Main Contractor', name: 'Main Contractor', description: 'Main contractor staff — manage WOs, PM, assign subcontractors', color: '#8B5CF6', level: 65 },
  { id: 'Sub Contractor',  name: 'Sub Contractor',  description: 'Sub contractor staff — execute assigned WOs only', color: '#F59E0B', level: 35 },
  { id: 'Accountant',      name: 'Accountant',      description: 'Finance module: invoices, payments, expenses', color: '#059669', level: 60 },
  { id: 'Sales Manager',   name: 'Sales Manager',   description: 'Sales module: quotations, orders, invoices', color: '#D97706', level: 60 },
  { id: 'Purchasing',      name: 'Purchasing',      description: 'Procurement: vendors, POs, goods receipts', color: '#0891B2', level: 50 },
  { id: 'Storekeeper',     name: 'Storekeeper',     description: 'Inventory: stock movements, adjustments', color: '#65A30D', level: 40 },
  { id: 'HR',              name: 'HR',              description: 'HR module: employees, leave, training', color: '#DB2777', level: 60 },
  { id: 'Technician',      name: 'Technician',      description: 'Maintenance: work orders, PM, CM (own only)', color: '#EA580C', level: 30 },
  { id: 'Employee',        name: 'Employee',        description: 'Self-service: view own records, request leave', color: '#64748B', level: 20 },
  { id: 'Viewer',          name: 'Viewer',          description: 'Read-only access to all modules', color: '#94A3B8', level: 10 },
];

// Default demo users (passwords are plaintext for demo only)
export const DEFAULT_USERS = [
  { name: 'System Administrator', email: 'admin@fmcore.ae',  username: 'admin',     password: 'admin123',     role: 'Super Admin',   department: 'IT',           status: 'Active' },
  { name: 'John Smith',            email: 'john@fmcore.ae',   username: 'john',      password: 'john123',      role: 'Manager',       department: 'Administration', status: 'Active' },
  { name: 'Ahmed Ali',             email: 'ahmed@fmcore.ae', username: 'ahmed',     password: 'ahmed123',     role: 'Technician',    department: 'Maintenance',  status: 'Active' },
  { name: 'Fatima Al-Rashid',      email: 'fatima@fmcore.ae',username: 'fatima',    password: 'fatima123',    role: 'HR',            department: 'Safety',        status: 'Active' },
  { name: 'Priya Sharma',          email: 'priya@fmcore.ae', username: 'priya',     password: 'priya123',     role: 'Accountant',    department: 'Operations',    status: 'Active' },
];

/**
 * Migrate existing registers: add new columns from seed data without removing existing ones.
 * This is idempotent — only adds columns that don't exist yet.
 */
async function migrateRegisterColumns() {
  for (const seed of REGISTER_SEEDS) {
    const reg = await db.register.findFirst({ where: { code: seed.code } });
    if (!reg) continue;
    const existingCols = JSON.parse(reg.columns) as ColumnDef[];
    const existingNames = new Set(existingCols.map((c) => c.name));
    const newCols = seed.columns.filter((c) => !existingNames.has(c.name));
    if (newCols.length === 0) continue;
    const merged = [...existingCols, ...newCols];
    await db.register.update({
      where: { id: reg.id },
      data: { columns: JSON.stringify(merged) },
    });
    await db.auditLog.create({
      data: {
        action: 'Updated',
        module: reg.name,
        registerId: reg.id,
        summary: `Schema migration: added ${newCols.length} column(s) (${newCols.map((c) => c.name).join(', ')})`,
        oldValue: reg.columns,
        newValue: JSON.stringify(merged),
      },
    }).catch(() => {});
  }

  // Also create any NEW registers from the seed that don't exist yet
  for (const seed of REGISTER_SEEDS) {
    const exists = await db.register.findFirst({ where: { code: seed.code } });
    if (exists) continue;
    const order = await db.register.count({ where: { category: seed.category } });
    const reg = await db.register.create({
      data: {
        code: seed.code,
        name: seed.name,
        icon: seed.icon,
        category: seed.category,
        color: seed.color,
        description: seed.description || null,
        columns: JSON.stringify(seed.columns),
        isSystem: true,
        order: order + 1,
      },
    });
    for (let r = 0; r < seed.records.length; r++) {
      await db.record.create({
        data: {
          registerId: reg.id,
          sequence: r + 1,
          data: JSON.stringify(seed.records[r]),
          createdBy: 'system',
        },
      });
    }
  }
}

/**
 * Add new seed records to existing registers if the register has fewer records than the seed.
 * This is idempotent — only adds records that don't exist yet (matched by sequence).
 * Enables "add more demo data" without wiping the DB.
 */
async function migrateNewRecords() {
  for (const seed of REGISTER_SEEDS) {
    const reg = await db.register.findFirst({ where: { code: seed.code } });
    if (!reg) continue;
    const existingCount = await db.record.count({ where: { registerId: reg.id, isDeleted: false } });
    const seedCount = seed.records.length;
    if (existingCount >= seedCount) continue; // already has all records

    // Add only the NEW records (those beyond existingCount)
    for (let r = existingCount; r < seedCount; r++) {
      try {
        await db.record.create({
          data: {
            registerId: reg.id,
            sequence: r + 1,
            data: JSON.stringify(seed.records[r]),
            createdBy: 'system',
          },
        });
      } catch (e) {
        // skip duplicate sequence (shouldn't happen, but be safe)
      }
    }
  }
}

export async function seedDatabase(force = false) {
  // Check if already seeded
  const existing = await db.register.count();
  if (existing > 0 && !force) {
    // ---- Schema Migration: add new columns to existing registers ----
    await migrateRegisterColumns();
    // ---- Record Migration: add new demo records (e.g. extra WOs/assets) ----
    await migrateNewRecords();
    // Even on already-seeded, ensure users exist
    await ensureDefaultUsers();
    return { seeded: false, reason: 'already_seeded', count: existing };
  }

  if (force) {
    // Wipe all registers + records (cascade)
    await db.record.deleteMany();
    await db.register.deleteMany();
    await db.notification.deleteMany();
    await db.auditLog.deleteMany();
    await db.savedView.deleteMany();
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
    { key: 'company.name', value: 'Roza FM Facilities', category: 'company' },
    { key: 'company.address', value: 'Sheikh Zayed Road, Dubai, UAE', category: 'company' },
    { key: 'company.phone', value: '+971-4-XXX-XXXX', category: 'company' },
    { key: 'company.email', value: 'info@fmcore.ae', category: 'company' },
    { key: 'company.tax_number', value: 'TRN100-XXX-XXX', category: 'company' },
    { key: 'company.currency', value: 'AED', category: 'company' },
    { key: 'company.country', value: 'United Arab Emirates', category: 'company' },
    { key: 'company.fiscal_year', value: 'Jan-Dec', category: 'company' },
    { key: 'date_format', value: 'DD/MM/YYYY', category: 'general' },
    { key: 'app_version', value: '1.0.0', category: 'general' },
    { key: 'schema_version', value: '2', category: 'general' },
    { key: 'auth.enabled', value: 'true', category: 'auth' },
    { key: 'auth.allow_signup', value: 'false', category: 'auth' },
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
    { type: 'system', title: 'System Initialized', message: 'Roza FM Suite initialized with sample data', severity: 'success', link: '/' },
  ];

  for (const n of notifications) {
    await db.notification.create({ data: n });
  }

  // Seed default users
  const userCount = await ensureDefaultUsers();

  // Audit log entry
  await db.auditLog.create({
    data: {
      action: 'Imported',
      module: 'System',
      summary: `Database seeded with ${totalRegisters} registers, ${totalRecords} sample records, ${userCount} users`,
      oldValue: null,
      newValue: JSON.stringify({ registers: totalRegisters, records: totalRecords, users: userCount }),
    },
  });

  return { seeded: true, registers: totalRegisters, records: totalRecords, users: userCount };
}

// Idempotently create default users if they don't exist
async function ensureDefaultUsers(): Promise<number> {
  let count = 0;
  for (const u of DEFAULT_USERS) {
    const existing = await db.user.findUnique({ where: { username: u.username } });
    if (!existing) {
      const initials = u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
      await db.user.create({
        data: {
          name: u.name,
          email: u.email,
          username: u.username,
          password: u.password, // plaintext for demo
          role: u.role,
          department: u.department,
          avatar: initials,
          status: u.status,
          permissions: JSON.stringify(getRolePermissions(u.role)),
        },
      });
      count++;
    } else {
      count++;
    }
  }
  return count;
}

// Returns default permissions per role (module → allowed actions)
export function getRolePermissions(role: string): { module: string; actions: string[] }[] {
  const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import'];
  const READ_ONLY = ['view'];
  const STANDARD = ['view', 'create', 'edit', 'export'];
  const STANDARD_PLUS_APPROVE = ['view', 'create', 'edit', 'approve', 'export'];
  const FULL = ALL_ACTIONS;

  const MODULES_LIST = [
    'dashboard', 'meetings', 'attendance', 'toolbox',
    'workorders', 'wo_attachments', 'pm', 'cm', 'gen_log', 'chiller_log', 'elec_insp',
    'safety_insp', 'risk_assess', 'ptw', 'incidents', 'accident', 'fire_equip',
    'assets', 'equipment', 'buildings', 'calibration',
    'vendors', 'contracts', 'mat_req', 'pur_req', 'inventory', 'siv',
    'visitors', 'leave', 'training',
    'housekeeping', 'kpi', 'checklists', 'method_stmt', 'locations',
    'reports', 'audit', 'settings', 'users', 'recycle_bin', 'role_access',
  ];
  const MODULES = MODULES_LIST;

  switch (role) {
    case 'Super Admin':
    case 'Administrator':
      return MODULES.map((m) => ({ module: m, actions: FULL }));
    case 'Manager':
      return MODULES.filter((m) => m !== 'users' && m !== 'settings').map((m) => ({ module: m, actions: STANDARD_PLUS_APPROVE }));
    case 'Accountant':
      return ['dashboard', 'vendors', 'contracts', 'pur_req', 'inventory', 'reports', 'audit']
        .map((m) => ({ module: m, actions: STANDARD_PLUS_APPROVE }));
    case 'Sales Manager':
      return ['dashboard', 'vendors', 'contracts', 'mat_req', 'reports', 'audit']
        .map((m) => ({ module: m, actions: STANDARD_PLUS_APPROVE }));
    case 'Purchasing':
      return ['dashboard', 'vendors', 'contracts', 'mat_req', 'pur_req', 'inventory', 'siv', 'reports']
        .map((m) => ({ module: m, actions: STANDARD }));
    case 'Storekeeper':
      return ['dashboard', 'inventory', 'siv', 'mat_req']
        .map((m) => ({ module: m, actions: STANDARD }));
    case 'HR':
      return ['dashboard', 'attendance', 'visitors', 'leave', 'training', 'reports']
        .map((m) => ({ module: m, actions: STANDARD_PLUS_APPROVE }));
    case 'Client Staff':
      return ['dashboard', 'workorders', 'pm', 'assets', 'reports']
        .map((m) => ({ module: m, actions: READ_ONLY }));
    case 'Main Contractor':
      return ['dashboard', 'workorders', 'wo_attachments', 'pm', 'cm', 'assets', 'checklists', 'method_stmt', 'locations', 'reports']
        .map((m) => ({ module: m, actions: STANDARD_PLUS_APPROVE }));
    case 'Sub Contractor':
      return ['dashboard', 'workorders', 'wo_attachments', 'checklists']
        .map((m) => ({ module: m, actions: STANDARD }));
    case 'Technician':
      return ['dashboard', 'workorders', 'wo_attachments', 'pm', 'cm', 'gen_log', 'chiller_log', 'elec_insp', 'checklists', 'method_stmt', 'locations']
        .map((m) => ({ module: m, actions: STANDARD }));
    case 'Employee':
      return ['dashboard', 'attendance', 'leave', 'training']
        .map((m) => ({ module: m, actions: READ_ONLY }));
    case 'Viewer':
      return MODULES.map((m) => ({ module: m, actions: READ_ONLY }));
    default:
      return [{ module: 'dashboard', actions: READ_ONLY }];
  }
}

export async function resetDatabase() {
  await db.record.deleteMany();
  await db.register.deleteMany();
  await db.notification.deleteMany();
  await db.auditLog.deleteMany();
  await db.savedView.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.setting.deleteMany({ where: { category: { not: 'general' } } });
  return { reset: true };
}

export async function getStats() {
  const [registers, records, auditLogs, notifications, settings, unreadNotifs, users, activeSessions] = await Promise.all([
    db.register.count({ where: { isDeleted: false } }),
    db.record.count({ where: { isDeleted: false } }),
    db.auditLog.count(),
    db.notification.count(),
    db.setting.count(),
    db.notification.count({ where: { isRead: false } }),
    db.user.count(),
    db.session.count({ where: { expiresAt: { gt: new Date() } } }),
  ]);
  return { registers, records, auditLogs, notifications, settings, unreadNotifs, users, activeSessions };
}

export { MASTER_DATA };

// All module codes — used for permission editor in User Management
export const ALL_MODULE_CODES = [
  'dashboard', 'meetings', 'attendance', 'toolbox',
  'workorders', 'wo_attachments', 'pm', 'cm', 'gen_log', 'chiller_log', 'elec_insp',
  'safety_insp', 'risk_assess', 'ptw', 'incidents', 'accident', 'fire_equip',
  'assets', 'equipment', 'buildings', 'calibration',
  'vendors', 'contracts', 'mat_req', 'pur_req', 'inventory', 'siv',
  'visitors', 'leave', 'training',
  'housekeeping', 'kpi', 'checklists', 'method_stmt', 'locations',
  'reports', 'audit', 'settings', 'users', 'recycle_bin', 'role_access',
];

// All possible actions per module
export const ALL_MODULE_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import'];
