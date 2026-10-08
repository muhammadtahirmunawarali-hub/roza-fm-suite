// Roza FM Suite — Core Type Definitions
// ============================================================

// ---------- Column Types (Form Builder) ----------
export type ColumnType =
  | 'auto_increment'
  | 'text'
  | 'long_text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'time'
  | 'dropdown'
  | 'status'
  | 'priority'
  | 'multi_select'
  | 'email'
  | 'phone'
  | 'rating'
  | 'employee'
  | 'department'
  | 'building'
  | 'asset'
  | 'equipment'
  | 'vendor'
  | 'image'
  | 'url'
  | 'color'
  | 'tags'
  | 'checklist'; // interactive checklist: items with Completed/NA/Pending + notes

export interface ColumnDef {
  name: string;
  type: ColumnType;
  width?: number;
  options?: string[]; // for dropdown/status/priority/multi_select
  required?: boolean;
  default?: string | number | boolean | string[];
  checklistItems?: { text: string; required?: boolean; category?: 'info'|'warning'|'critical' }[]; // for checklist column type — the template items
}

// Checklist item status — stored per-item in the record's JSON data
export type ChecklistItemStatus = 'Completed' | 'N/A' | 'Pending';
export interface ChecklistItem {
  text: string;
  status: ChecklistItemStatus;
  notes?: string;
  required?: boolean;
  category?: 'info' | 'warning' | 'critical';
}

// ---------- Registers ----------
export type RegisterCategory =
  | 'operations'
  | 'maintenance'
  | 'safety'
  | 'assets'
  | 'procurement'
  | 'hr'
  | 'performance'
  | 'documents'
  | 'admin';

export interface RegisterCategoryMeta {
  id: RegisterCategory;
  name: string;
  icon: string;
  order: number;
  color: string;
}

export const REGISTER_CATEGORIES: Record<RegisterCategory, RegisterCategoryMeta> = {
  operations:  { id: 'operations',  name: 'Operations',            icon: 'fa-gears',                 order: 1, color: '#3B82F6' },
  maintenance: { id: 'maintenance', name: 'Maintenance',           icon: 'fa-wrench',                order: 2, color: '#F59E0B' },
  safety:      { id: 'safety',      name: 'Safety',                icon: 'fa-shield-halved',         order: 3, color: '#EF4444' },
  assets:      { id: 'assets',      name: 'Assets & Equipment',    icon: 'fa-building',              order: 4, color: '#8B5CF6' },
  procurement: { id: 'procurement', name: 'Procurement & Inventory', icon: 'fa-boxes-stacked',      order: 5, color: '#10B981' },
  hr:          { id: 'hr',          name: 'Human Resources',       icon: 'fa-users',                 order: 6, color: '#EC4899' },
  performance: { id: 'performance', name: 'Performance & Quality', icon: 'fa-chart-line',           order: 7, color: '#06B6D4' },
  documents:   { id: 'documents',   name: 'Documents & Contracts',  icon: 'fa-file-lines',            order: 8, color: '#F97316' },
  admin:       { id: 'admin',       name: 'Administration',         icon: 'fa-screwdriver-wrench',    order: 9, color: '#64748B' },
};

export interface Register {
  id: string;
  code: string;
  name: string;
  icon: string;
  category: RegisterCategory;
  color: string;
  description?: string | null;
  columns: ColumnDef[];
  isSystem: boolean;
  isDeleted: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecordData {
  id: string;
  registerId: string;
  sequence: number;
  data: Record<string, any>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

// ---------- Tabs ----------
export type TabType = 'dashboard' | 'register' | 'settings' | 'reports' | 'audit' | 'users' | 'recycle' | 'role_access';

export interface Tab {
  id: string;          // unique tab id
  type: TabType;
  label: string;
  icon: string;
  refId?: string;      // register id if type=register
}

// ---------- Audit Log ----------
export interface AuditLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;      // Created|Updated|Deleted|Approved|Cancelled|Logged In|Exported|Imported
  module: string;
  registerId?: string | null;
  recordId?: string | null;
  oldValue?: any;
  newValue?: any;
  summary: string;
  ip?: string | null;
  createdAt: string;
}

// ---------- Settings ----------
export interface Setting {
  key: string;
  value: string;
  category: string;
  updatedAt: string;
}

// ---------- Notifications ----------
export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success';
export type NotificationType =
  | 'low_stock'
  | 'overdue_invoice'
  | 'pending_approval'
  | 'work_order_overdue'
  | 'maintenance_due'
  | 'task_due'
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

// ---------- Users ----------
export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  branch?: string | null;
  department?: string | null;
  avatar?: string | null;
  status: string;
  permissions: any[];
  tenantId?: string | null; // SaaS: null = Super Admin / system user, otherwise links to Tenant
  mustChangePassword?: boolean; // true = force password change on next page load
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Dashboard ----------
export interface DashboardKPI {
  id: string;
  label: string;
  value: string | number;
  rawValue?: number;
  delta?: string;
  deltaType?: 'up' | 'down' | 'flat';
  icon: string;
  color: string;
  link?: string;
  sparkline?: number[]; // 7-day trend data
}

export interface DashboardChart {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'doughnut' | 'pie' | 'radar' | 'polarArea';
  data: { label: string; value: number; color?: string }[];
  options?: any;
}

export interface DashboardData {
  kpis: DashboardKPI[];
  charts: DashboardChart[];
  recentActivity: AuditLog[];
  upcomingItems: { label: string; date: string; register: string; severity: NotificationSeverity }[];
  activityByDay?: { date: string; created: number; updated: number; deleted: number }[];
}

// ---------- API helpers ----------
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}
