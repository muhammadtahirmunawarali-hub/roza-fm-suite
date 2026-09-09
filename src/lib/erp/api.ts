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
  bulkCreate: (registerId: string, records: Record<string, any>[]) =>
    request<{ ok: boolean; imported: number; failed: number; errors: { row: number; error: string }[] }>(`${BASE}/registers/${registerId}/records/bulk`, { method: 'POST', body: JSON.stringify({ records }) }),
  // Status transition (approval workflow)
  getTransitions: (registerId: string, recordId: string) =>
    request<{
      ok: boolean;
      currentStatus: string;
      availableActions: { action: string; to: string; label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'accent' }[];
    }>(`${BASE}/registers/${registerId}/records/${recordId}/transition`),
  transition: (registerId: string, recordId: string, action: string, comment?: string) =>
    request<{ ok: boolean; record: RecordData; transition: { from: string; to: string; action: string } }>(
      `${BASE}/registers/${registerId}/records/${recordId}/transition`,
      { method: 'POST', body: JSON.stringify({ action, comment }) },
    ),
  // Record history (audit log for a specific record)
  getHistory: (registerId: string, recordId: string) =>
    request<{
      ok: boolean;
      history: {
        id: string;
        action: string;
        summary: string;
        userName: string;
        userAvatar: string;
        userRole: string | null;
        statusChange: { from: string; to: string } | null;
        createdAt: string;
        oldValue: any;
        newValue: any;
      }[];
    }>(`${BASE}/registers/${registerId}/records/${recordId}/history`),
  // Related records (records in other registers that reference the same entity)
  getRelated: (registerId: string, recordId: string) =>
    request<{
      ok: boolean;
      related: {
        registerId: string;
        registerName: string;
        registerCode: string;
        registerIcon: string;
        registerColor: string;
        records: {
          id: string;
          sequence: number;
          data: Record<string, any>;
          matchedOn: string;
          matchedColumn: string;
          createdAt: string;
        }[];
      }[];
    }>(`${BASE}/registers/${registerId}/records/${recordId}/related`),
};

// ---------- Dashboard ----------
export const dashboardApi = {
  get: () => request<DashboardData>(`${BASE}/dashboard`),
};

// ---------- Dashboard Preferences (pin/hide/reorder KPIs & charts) ----------
export interface DashboardPrefs {
  pinnedKpis: string[];
  hiddenKpis: string[];
  kpiOrder: string[];
  pinnedCharts: string[];
  hiddenCharts: string[];
  chartOrder: string[];
}

export const dashboardPrefsApi = {
  get: () => request<DashboardPrefs>(`${BASE}/dashboard-prefs`),
  save: (prefs: Partial<DashboardPrefs>) =>
    request<DashboardPrefs & { ok?: boolean }>(`${BASE}/dashboard-prefs`, { method: 'POST', body: JSON.stringify(prefs) }),
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

// ---------- AI Insights ----------
export const aiInsightsApi = {
  get: () => request<{ ok: boolean; insights: any[]; count: number; generatedAt: string }>(`${BASE}/ai/insights`),
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

// ---------- Stock Movements ----------
export interface StockMovement {
  id: string;
  itemDescription: string;
  movementType: string;
  quantity: number;
  woRegisterId?: string | null;
  woRecordId?: string | null;
  woSequence?: number | null;
  invRegisterId?: string | null;
  invRecordId?: string | null;
  movedBy?: string | null;
  note?: string | null;
  createdAt: string;
}

export const stockMovementApi = {
  list: (params: { woRecordId?: string; movementType?: string; page?: number; pageSize?: number } = {}) => {
    const p = new URLSearchParams();
    if (params.woRecordId) p.set('woRecordId', params.woRecordId);
    if (params.movementType) p.set('movementType', params.movementType);
    if (params.page) p.set('page', String(params.page));
    if (params.pageSize) p.set('pageSize', String(params.pageSize));
    return request<{ data: StockMovement[]; total: number; page: number; pageSize: number; totalPages: number }>(`${BASE}/stock-movements?${p}`);
  },
  create: (data: {
    itemDescription: string;
    movementType: string;
    quantity: number;
    woRegisterId?: string;
    woRecordId?: string;
    woSequence?: number;
    invRegisterId?: string;
    invRecordId?: string;
    note?: string;
  }) => request<{ ok: boolean; id: string; summary: string } & StockMovement>(`${BASE}/stock-movements`, { method: 'POST', body: JSON.stringify(data) }),
};

// ---------- System Stats ----------
export interface SystemStats {
  registers: number;
  records: number;
  users: number;
  activeUsers: number;
  inactiveUsers: number;
  auditLogs: number;
  notifications: number;
  unreadNotifs: number;
  settings: number;
  savedViews: number;
  activeSessions: number;
  dashboardPrefs: number;
}

export const statsApi = {
  get: () => request<SystemStats>(`${BASE}/stats`),
};

// ---------- Master data (for dropdowns) ----------
export const masterDataApi = {
  list: () => request<Record<string, string[]>>(`${BASE}/master-data`),
};

// ---------- Auth ----------
export const authApi = {
  login: (username: string, password: string) =>
    request<{ ok: boolean; user: User }>(`${BASE}/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () =>
    request<ApiResponse>(`${BASE}/auth/logout`, { method: 'POST' }),
  me: () =>
    request<{ ok: boolean; authenticated: boolean; user?: User; reason?: string }>(`${BASE}/auth/me`),
};

// ---------- Users ----------
export const usersApi = {
  list: () => request<User[]>(`${BASE}/users`),
  create: (data: Partial<User> & { password: string }) =>
    request<User>(`${BASE}/users`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<User> & { password?: string }) =>
    request<User>(`${BASE}/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) =>
    request<ApiResponse>(`${BASE}/users/${id}`, { method: 'DELETE' }),
};

// ---------- Saved Views ----------
export interface SavedView {
  id: string;
  name: string;
  registerId: string;
  userId?: string | null;
  isShared: boolean;
  filters: { search?: string; filters?: Record<string, string>; sortField?: string; sortDir?: 'asc' | 'desc' };
  createdAt: string;
  updatedAt: string;
}

export const savedViewsApi = {
  list: (registerId: string) => request<SavedView[]>(`${BASE}/saved-views?registerId=${registerId}`),
  listAll: () => request<SavedViewMeta[]>(`${BASE}/saved-views/all`),
  create: (data: { name: string; registerId: string; filters: any; isShared?: boolean }) =>
    request<SavedView>(`${BASE}/saved-views`, { method: 'POST', body: JSON.stringify(data) }),
  update: (data: { id: string; name?: string; filters?: any; isShared?: boolean }) =>
    request<SavedView>(`${BASE}/saved-views`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) =>
    request<ApiResponse>(`${BASE}/saved-views/${id}`, { method: 'DELETE' }),
};

// Extended SavedView with metadata for management page
export interface SavedViewMeta extends SavedView {
  registerName: string;
  registerCode: string;
  registerIcon: string;
  registerColor: string;
  filterCount: number;
  hasSearch: boolean;
  hasSort: boolean;
}

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
  image:          { label: 'Image',       icon: 'fa-image',  needsOptions: false },
  url:            { label: 'URL / Link',  icon: 'fa-link',   needsOptions: false },
  color:          { label: 'Color',       icon: 'fa-palette', needsOptions: false },
  tags:           { label: 'Tags',        icon: 'fa-tags',   needsOptions: true },
};

// ---------- Uploads (image attachments) ----------
export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export const uploadsApi = {
  upload: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/uploads`, { method: 'POST', body: formData });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.error || j.message || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },
  remove: async (filename: string): Promise<ApiResponse> => {
    return request<ApiResponse>(`${BASE}/uploads?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
  },
};

// ---------- Tenants ----------
export const tenantsApi = {
  list: () => request<any[]>(`${BASE}/tenants`),
  create: (data: { name: string; slug: string; plan?: string }) =>
    request<any>(`${BASE}/tenants`, { method: 'POST', body: JSON.stringify(data) }),
};

// ---------- Billing ----------
export const billingApi = {
  getPlans: () => request<{ ok: boolean; plans: any[] }>(`${BASE}/billing/plans`),
  createCheckout: (planId: string, successUrl: string, cancelUrl: string) =>
    request<any>(`${BASE}/billing/checkout`, { method: 'POST', body: JSON.stringify({ planId, successUrl, cancelUrl }) }),
};

// ---------- API Keys ----------
export const apiKeysApi = {
  list: () => request<any[]>(`${BASE}/api-keys`),
  create: (data: { name: string; permissions?: string[] }) =>
    request<any>(`${BASE}/api-keys`, { method: 'POST', body: JSON.stringify(data) }),
};
