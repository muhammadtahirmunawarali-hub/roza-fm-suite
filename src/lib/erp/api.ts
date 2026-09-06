// FMCore ERP — API client (typed fetch wrappers around /api/erp/*)
import type {
  Register, RecordData, AuditLog, Setting, NotificationItem, User,
  DashboardData, ApiResponse, PaginatedResponse, ColumnDef,
} from './types';

const BASE = '/api/erp';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error || j.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ---------- Registers ----------
export const registersApi = {
  list: () => request<Register[]>(`${BASE}/registers`),
  get: (id: string) => request<Register>(`${BASE}/registers/${id}`),
  create: (data: Partial<Register>) =>
    request<Register>(`${BASE}/registers`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Register>) =>
    request<Register>(`${BASE}/registers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) =>
    request<ApiResponse>(`${BASE}/registers/${id}`, { method: 'DELETE' }),
};

// ---------- Records ----------
export interface RecordQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  filters?: Record<string, string>;
}

export const recordsApi = {
  list: (registerId: string, q: RecordQuery = {}) => {
    const p = new URLSearchParams();
    if (q.page) p.set('page', String(q.page));
    if (q.pageSize) p.set('pageSize', String(q.pageSize));
    if (q.search) p.set('search', q.search);
    if (q.sortField) p.set('sortField', q.sortField);
    if (q.sortDir) p.set('sortDir', q.sortDir);
    if (q.filters) Object.entries(q.filters).forEach(([k, v]) => v && p.set(`f_${k}`, v));
    return request<PaginatedResponse<RecordData>>(`${BASE}/registers/${registerId}/records?${p}`);
  },
  create: (registerId: string, data: Record<string, any>) =>
    request<RecordData>(`${BASE}/registers/${registerId}/records`, { method: 'POST', body: JSON.stringify({ data }) }),
  update: (registerId: string, recordId: string, data: Record<string, any>) =>
    request<RecordData>(`${BASE}/registers/${registerId}/records/${recordId}`, { method: 'PUT', body: JSON.stringify({ data }) }),
  remove: (registerId: string, recordId: string) =>
    request<ApiResponse>(`${BASE}/registers/${registerId}/records/${recordId}`, { method: 'DELETE' }),
};

// ---------- Dashboard ----------
export const dashboardApi = {
  get: () => request<DashboardData>(`${BASE}/dashboard`),
};

// ---------- Audit logs ----------
export const auditApi = {
  list: (params: { page?: number; pageSize?: number; module?: string } = {}) => {
    const p = new URLSearchParams();
    if (params.page) p.set('page', String(params.page));
    if (params.pageSize) p.set('pageSize', String(params.pageSize));
    if (params.module) p.set('module', params.module);
    return request<PaginatedResponse<AuditLog>>(`${BASE}/audit-logs?${p}`);
  },
};

// ---------- Settings ----------
export const settingsApi = {
  list: () => request<Setting[]>(`${BASE}/settings`),
  get: (key: string) => request<Setting>(`${BASE}/settings/${key}`),
  set: (key: string, value: string, category = 'general') =>
    request<Setting>(`${BASE}/settings`, { method: 'POST', body: JSON.stringify({ key, value, category }) }),
  bulkSet: (items: { key: string; value: string; category?: string }[]) =>
    request<ApiResponse>(`${BASE}/settings`, { method: 'PUT', body: JSON.stringify({ items }) }),
};

// ---------- Notifications ----------
export const notificationsApi = {
  list: () => request<NotificationItem[]>(`${BASE}/notifications`),
  markRead: (id: string) =>
    request<ApiResponse>(`${BASE}/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    request<ApiResponse>(`${BASE}/notifications/read-all`, { method: 'POST' }),
};

// ---------- AI Assistant ----------
export const aiApi = {
  chat: (message: string, history: { role: 'user' | 'assistant'; content: string }[] = []) =>
    request<{ reply: string; action?: { type: string; payload?: any } }>(`${BASE}/ai`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
};

// ---------- Global search ----------
export const searchApi = {
  search: (q: string) =>
    request<{ registerId: string; registerName: string; records: RecordData[] }[]>(`${BASE}/search?q=${encodeURIComponent(q)}`),
};

// ---------- Backup ----------
export const backupApi = {
  export: () => request<any>(`${BASE}/backup`),
  import: (data: any) =>
    request<ApiResponse>(`${BASE}/backup`, { method: 'POST', body: JSON.stringify({ data }) }),
  seed: () =>
    request<ApiResponse>(`${BASE}/seed`, { method: 'POST' }),
  reset: () =>
    request<ApiResponse>(`${BASE}/reset`, { method: 'POST' }),
};

// ---------- Master data (for dropdowns) ----------
export const masterDataApi = {
  list: () => request<Record<string, string[]>>(`${BASE}/master-data`),
};

// ---------- Column helpers (shared between client & server) ----------
export const COLUMN_TYPE_META: Record<ColumnDef['type'], { label: string; icon: string; needsOptions: boolean }> = {
  auto_increment: { label: 'Auto Number', icon: 'fa-hashtag', needsOptions: false },
  text:           { label: 'Text',        icon: 'fa-font',   needsOptions: false },
  long_text:      { label: 'Long Text',   icon: 'fa-align-left', needsOptions: false },
  number:         { label: 'Number',       icon: 'fa-9',      needsOptions: false },
  currency:       { label: 'Currency',    icon: 'fa-coins',  needsOptions: false },
  percentage:     { label: 'Percentage',  icon: 'fa-percent', needsOptions: false },
  date:           { label: 'Date',        icon: 'fa-calendar', needsOptions: false },
  datetime:       { label: 'Date & Time', icon: 'fa-calendar-days', needsOptions: false },
  time:           { label: 'Time',        icon: 'fa-clock',  needsOptions: false },
  dropdown:       { label: 'Dropdown',    icon: 'fa-list',   needsOptions: true },
  status:         { label: 'Status',      icon: 'fa-flag',   needsOptions: true },
  priority:       { label: 'Priority',    icon: 'fa-bolt',   needsOptions: true },
  multi_select:   { label: 'Multi-Select', icon: 'fa-list-check', needsOptions: true },
  email:          { label: 'Email',       icon: 'fa-envelope', needsOptions: false },
  phone:          { label: 'Phone',       icon: 'fa-phone',  needsOptions: false },
  rating:         { label: 'Rating',      icon: 'fa-star',   needsOptions: false },
  employee:       { label: 'Employee',    icon: 'fa-user',   needsOptions: false },
  department:     { label: 'Department',  icon: 'fa-building-user', needsOptions: false },
  building:       { label: 'Building',    icon: 'fa-city',   needsOptions: false },
  asset:          { label: 'Asset',       icon: 'fa-cube',   needsOptions: false },
  equipment:      { label: 'Equipment',   icon: 'fa-gears',  needsOptions: false },
  vendor:         { label: 'Vendor',      icon: 'fa-truck',  needsOptions: false },
};
