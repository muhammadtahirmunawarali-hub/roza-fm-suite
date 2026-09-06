# FMCore ERP — Rebuild Worklog

## Project Goal
Rebuild the attached `DD.html` (FMCore ERP — Dynamic Register & Form Builder) into a complete, professional, scalable ERP application running on Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui + Tailwind CSS 4.

## Reference Architecture (from prompt)
```
ERP
├── Dashboard (KPIs + charts + sparklines + activity timeline, clickable, customizable)
├── Modules
│   ├── Operations   (Meeting Minutes, Attendance, Toolbox Talks)
│   ├── Maintenance   (Work Orders, PM, CM, Generator Log, Chiller Log, Electrical Inspection)
│   ├── Safety        (Inspections, Risk Assessment, Permit to Work, Incidents, Accidents, Fire Equip)
│   ├── Assets        (Assets, Equipment, Buildings, Calibration)
│   ├── Procurement   (Vendors, Contracts, Material Request, Purchase Request, Inventory, SIV)
│   ├── HR            (Visitors, Leave, Training)
│   └── Performance   (Housekeeping, KPI)
├── Master Data (Registers / dynamic schema)
├── Transactions (records in registers + status transitions + workflow history + inline edit)
├── Reports (derived from register data)
├── Administration (Users, Roles, Audit Logs, Saved Views, Dashboard Prefs)
└── Settings (theme, currency, document numbering, etc.)
```

## Core Design Decisions
1. **Preserve the "Dynamic Register & Form Builder" concept** — registers are schema-driven.
2. **Prisma + SQLite persistence** (server-side, ready for SaaS migration).
3. **API-first**: every frontend action hits `/api/erp/*` routes.
4. **Audit log** records every create/update/delete/approval with old + new values.
5. **Theme**: light/dark via class on `<html>`, persisted via Zustand.
6. **Responsive**: works on mobile, tablet, laptop, desktop.
7. **Sticky footer** (status bar) per UI rules.
8. **Cookie-based session auth** (httpOnly, 7-day expiry).
9. **RBAC enforced both client-side (UI gating) and server-side (transition endpoint validates via session cookie → user → permissions).**

## Tech Stack
- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York)
- Prisma 6 + SQLite (with Session, User, SavedView, UserDashboardPref models)
- Zustand (client state)
- Recharts (charts) + custom Sparkline SVG component + EmptyStateIllustration SVG component
- z-ai-web-dev-sdk (AI Assistant, backend only)
- Lucide icons + Font Awesome 6.5 (CDN) for register icons

---

## Round 6 — Status (2026-09-06)

### QA Findings (from start of Round 6)
- ✅ Verified all Round 5 features still work (Record Detail Drawer with 3 tabs, Workflow History timeline, Server-side permission checks, Empty state SVG illustrations)
- ✅ Login flow works (admin → dashboard with sparklines + Quick Actions + Activity Timeline)
- ✅ Record Detail Drawer opens on View click → shows Details/History/Activity tabs
- ✅ History tab shows timeline with LATEST badge
- ✅ 93 records, 5 users, 30 registers
- ✅ No console errors
- No new bugs found — system stable

### Work Focus This Round
Per Round 5 worklog's Priority 1 & 2 list, this round delivered 2 high-impact features:
1. **Inline Edit in Record Detail Drawer** — Edit fields directly in the drawer without opening a modal
2. **Custom Dashboard Widgets** — Pin/hide KPIs and charts via a Customize modal, with per-user preferences saved to DB

### What Was Done This Round

#### ✨ New Features

1. **Inline Edit in Record Detail Drawer** (`record-detail-drawer.tsx`, upgraded to 700+ lines) — Priority 2:
   - **"Inline Edit" button** in the drawer action bar (replaces the old "Edit" button that opened the RecordForm modal)
   - **Edit mode**: When clicked, the drawer switches to edit mode:
     - "EDITING" badge appears in the header
     - Action bar changes to "Cancel" + "Save Changes" buttons
     - Tabs are hidden to maximize editing space
     - Info banner: "Edit fields directly. Changes are saved when you click 'Save Changes'"
     - All fields become editable with type-appropriate inputs (date pickers, dropdowns, multi-select chips, star ratings, currency with AED prefix, percentage with % suffix, email/phone inputs, long text areas)
   - **Validation**: Uses the same `validateRecord()` utility as the RecordForm modal — shows error count banner + per-field error messages with AlertCircle icon
   - **Save**: Clicking "Save Changes" validates → calls `recordsApi.update()` → toast "Record updated successfully" → returns to view mode → calls `onRefresh()` to reload the record data
   - **Cancel**: Clicking "Cancel" or pressing Escape discards changes and returns to view mode
   - **Master data loading**: Loads employee/department/building/asset/equipment/vendor dropdown options on drawer open
   - **Field focus styling**: Focused fields get accent border + ring for clear visual feedback
   - **Error state**: Fields with validation errors get red border + error message below

2. **Custom Dashboard Widgets** (`dashboard-customize.tsx`, 250 lines + `dashboard-prefs` API) — Priority 1:
   - **New Prisma model**: `UserDashboardPref` — stores per-user preferences (pinnedKpis, hiddenKpis, kpiOrder, pinnedCharts, hiddenCharts, chartOrder) as JSON arrays
   - **New API routes**: `GET /api/erp/dashboard-prefs` (returns current user's prefs), `POST /api/erp/dashboard-prefs` (saves prefs)
   - **API client**: Added `dashboardPrefsApi.get()` and `dashboardPrefsApi.save()` methods + `DashboardPrefs` interface
   - **Customize button** in dashboard header (gear icon) with notification dot when preferences are active
   - **Customize modal** with two sections:
     - **KPI Cards**: Grid of all 14 KPIs, each with pin button (Pin to top) and hide/show toggle. Pinned KPIs show accent border + pin icon. Hidden KPIs show opacity-50 + EyeOff icon.
     - **Charts**: List of all 6 charts, each with hide/show toggle. Shows chart type + data point count.
   - **Dashboard integration**: 
     - KPIs are filtered (hidden ones removed) and sorted (pinned ones first)
     - Pinned KPIs show a small pin icon in the top-right corner + accent-tinted background
     - Charts are filtered (hidden ones not rendered)
     - Empty state shown if all KPIs are hidden ("All KPIs are hidden" with "Open Customize" button)
   - **Reset button**: Clears all preferences back to defaults
   - **Per-user persistence**: Preferences are tied to the logged-in user's session, so different users see different dashboard layouts

#### 🎨 Styling Polish
- Inline Edit mode: "EDITING" badge with pencil icon in header
- Edit mode info banner with accent background
- Focused field styling: accent border + ring
- Pinned KPI cards: accent border + pin icon in top-right + subtle accent-tinted background
- Customize button: gear icon with notification dot when prefs are active
- Customize modal: KPI grid with pin/hide buttons, chart list with type + data count
- Error banner: red-tinted background with AlertCircle icon + count
- Save button: green (success) color in edit mode
- Cancel button: outline style with XCircle icon

#### 🔧 Backend Updates
- **New Prisma model**: `UserDashboardPref` (userId unique, 6 JSON array fields for KPI/chart pin/hide/order)
- **New API routes** (2): `GET/POST /api/erp/dashboard-prefs`
- **Dashboard API client**: Added `dashboardPrefsApi` with `DashboardPrefs` interface
- **Server-side auth**: Dashboard prefs endpoint reads session cookie → looks up user → saves preferences for that user

### Verification Results (agent-browser)
- ✅ Login as admin → dashboard renders with new "Customize" button in header
- ✅ Click "Customize" → modal opens showing all 14 KPIs (with pin/hide buttons) + 6 charts (with hide buttons)
- ✅ Click Pin on "Open Work Orders" KPI → pin icon fills
- ✅ Click Hide on "Inventory Status" chart → opacity reduced + EyeOff icon
- ✅ Click "Save Preferences" → toast "Dashboard preferences saved" → modal closes → dashboard reloads
- ✅ Navigate to Purchase Request → click View → Record Detail Drawer opens
- ✅ Click "Inline Edit" button → drawer switches to edit mode:
  - "EDITING" badge appears in header
  - Action bar shows "Cancel" + "Save Changes" buttons
  - Info banner: "Edit fields directly..."
  - All fields become editable (date, text, dropdowns, currency with AED, status, priority)
  - Tabs hidden to maximize space
- ✅ Click "Save Changes" → toast "Record updated successfully" → returns to view mode
- ✅ PUT /records/[id] returns 200 (record updated in DB)
- ✅ Lint: 0 errors, 0 warnings
- ✅ Dev server stable (PID 19464)
- ✅ All API routes return 200 (including new dashboard-prefs endpoint)

### Files Modified/Created This Round
```
NEW: src/components/erp/dashboard-customize.tsx         (250 lines — pin/hide KPIs & charts modal)
NEW: src/app/api/erp/dashboard-prefs/route.ts           (GET/POST user dashboard preferences)
MODIFIED: prisma/schema.prisma                          (added UserDashboardPref model)
MODIFIED: src/lib/erp/api.ts                            (added dashboardPrefsApi + DashboardPrefs interface)
MODIFIED: src/components/erp/dashboard.tsx              (load + apply prefs, Customize button, pin indicators, chart filtering)
MODIFIED: src/components/erp/record-detail-drawer.tsx   (added InlineEditTab + InlineField + MultiSelectInline + edit mode state + save/cancel logic)
```

## Current Goals / Completed Modifications
- [DONE] Architecture + design system (Round 1)
- [DONE] Prisma schema + seed (30 registers, 89 records) (Round 1)
- [DONE] All API routes (CRUD + dashboard + AI + search + backup) (Round 1)
- [DONE] Full ERP shell with all 7 modules (Round 1)
- [DONE] Fix Audit Log modal Escape handling (Round 2)
- [DONE] CSV Import workflow (Round 2)
- [DONE] Print Record feature (Round 2)
- [DONE] Bulk Actions (Round 2)
- [DONE] Record form sections + progress bar (Round 2)
- [DONE] Clickable KPIs + Quick Actions (Round 2)
- [DONE] Styling polish: icons in badges, gradient headers, animations (Round 2)
- [DONE] Login screen with cookie-based session auth (Round 3)
- [DONE] RBAC: 11 roles + per-module permission matrix (Round 3)
- [DONE] User Management admin view (CRUD) (Round 3)
- [DONE] User Menu dropdown (Round 3)
- [DONE] 5 demo users seeded (Round 3)
- [DONE] Status bar shows real user info (Round 3)
- [DONE] Permission Enforcement in UI (Round 4) — sidebar + action buttons gated by role
- [DONE] Approval Workflow UI (Round 4) — state machine + Approve/Reject/Submit/Cancel
- [DONE] Saved Views UI (Round 4) — save/load named filter combinations
- [DONE] KPI Sparklines + Activity Timeline (Round 4) — 7-day trend charts
- [DONE] Record Detail Drawer (Round 5) — slide-in panel with Details/History/Activity tabs
- [DONE] Workflow History timeline (Round 5) — visual timeline of status transitions per record
- [DONE] Server-side permission checks (Round 5) — transition endpoint validates session + role
- [DONE] Empty state SVG illustrations (Round 5) — custom illustrations for 7 empty states
- [DONE] **Inline Edit in Record Detail Drawer** (Round 6) — edit fields directly without opening modal
- [DONE] **Custom Dashboard Widgets** (Round 6) — pin/hide KPIs & charts with per-user preferences

## Unresolved Issues / Risks / Next-Phase Priorities

### Priority 1 — High-Value Features Still Missing
1. **Real-time notifications** — Currently poll-based when panel opens. Next phase: WebSocket mini-service (port 3003) for push notifications. Approval actions already create notifications in DB; just need a push mechanism.
2. **Saved view management page** — Currently views can only be deleted from the dropdown; add a Settings tab to manage all saved views across registers.
3. **Server-side permission checks on all mutation endpoints** — Currently only the transition endpoint has server-side checks. Records CRUD, users CRUD, saved views CRUD still rely on client-side gating only.

### Priority 2 — Polish & UX
4. **Record detail drawer: Related records** — Show linked records (e.g. for a Work Order, show the Asset's details; for a Purchase Request, show the Vendor's details).
5. **Workflow history export** — Let users export the history timeline as PDF/CSV.
6. **Custom field types** — Add support for file attachments, images, computed fields, and formula fields in the register builder.
7. **Drag-and-drop reorder** — Let users drag KPIs/charts to reorder them (currently only pin/hide is supported).

### Priority 3 — Performance & Scale
8. **Server-side filtering** — Currently register filter/sort happens in JS after fetching all records. Move to SQL with proper indexing for datasets >5000 records.
9. **Pagination virtualization** — For 100+ records per page, use windowing.
10. **CSV import streaming** — For large CSV files (>1000 rows), stream parsing instead of loading all into memory.

### Known Limitations
- Print record uses `window.open()` which may be blocked by popup blockers (user must allow popups for the domain)
- Bulk print limited to 5 records (browser limitation on multiple print windows)
- AI Assistant context size limited to first 3 records per register (to fit in token budget)
- Mobile sidebar drawer doesn't auto-close on navigation (intentional — user may want to switch registers quickly)
- **Passwords stored in plaintext** for demo only — clearly noted in schema comment; production should use bcrypt/argon2
- **Session cookies are not signed** — for production, add HMAC signing or use a JWT library
- **Server-side permission checks** are implemented on the transition endpoint; other mutation endpoints (records CRUD, users CRUD, saved views CRUD) still rely on client-side gating only
- Workflow state machine is generic; some registers may need custom transitions
- Dashboard preferences don't yet support drag-and-drop reordering (only pin/hide)
- Inline edit doesn't auto-save on field blur (intentional — user must click "Save Changes" to commit)

## Files Created (cumulative across all rounds)
```
prisma/schema.prisma                          (Register, Record, AuditLog, Setting, Notification, OpenTab, User, Session, SavedView, UserDashboardPref)
src/lib/erp/types.ts                          (ColumnType, ColumnDef, Register, RecordData, DashboardKPI+sparkline, etc.)
src/lib/erp/sample-data.ts                    (30 registers + 89 records extracted from DD.html)
src/lib/erp/api.ts                            (typed API client + authApi + usersApi + savedViewsApi + bulkCreate + transitions + history + dashboardPrefsApi)
src/lib/erp/store.ts                          (Zustand: tabs, theme, panels, builder, user, auth, hasPermission)
src/lib/erp/utils.ts                          (formatCurrency, formatDate, statusVariant, validateRecord, etc.)
src/lib/erp/seed.ts                           (seedDatabase, resetDatabase, getStats, ROLES, DEFAULT_USERS, getRolePermissions)
src/app/api/erp/registers/route.ts
src/app/api/erp/registers/[id]/route.ts
src/app/api/erp/registers/[id]/records/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/transition/route.ts   (Round 4 + upgraded Round 5)
src/app/api/erp/registers/[id]/records/[recordId]/history/route.ts   (Round 5)
src/app/api/erp/registers/[id]/records/bulk/route.ts   (bulk import)
src/app/api/erp/auth/login/route.ts           (Round 3)
src/app/api/erp/auth/logout/route.ts          (Round 3)
src/app/api/erp/auth/me/route.ts              (Round 3)
src/app/api/erp/users/route.ts                (Round 3)
src/app/api/erp/users/[id]/route.ts           (Round 3)
src/app/api/erp/saved-views/route.ts          (Round 3)
src/app/api/erp/saved-views/[id]/route.ts     (Round 3)
src/app/api/erp/dashboard/route.ts            (upgraded: sparklines + activity timeline)
src/app/api/erp/dashboard-prefs/route.ts      ← NEW (Round 6)
src/app/api/erp/audit-logs/route.ts
src/app/api/erp/settings/route.ts
src/app/api/erp/notifications/route.ts
src/app/api/erp/notifications/[id]/read/route.ts
src/app/api/erp/notifications/read-all/route.ts
src/app/api/erp/ai/route.ts                   (z-ai-web-dev-sdk)
src/app/api/erp/search/route.ts
src/app/api/erp/master-data/route.ts
src/app/api/erp/backup/route.ts
src/app/api/erp/seed/route.ts
src/app/api/erp/reset/route.ts
src/components/erp/erp-shell.tsx               (auth gating)
src/components/erp/sidebar.tsx                  (permission filtering)
src/components/erp/toolbar.tsx                  (UserMenu integration)
src/components/erp/tab-bar.tsx
src/components/erp/status-bar.tsx               (real user info)
src/components/erp/dashboard.tsx              (clickable KPIs + Quick Actions + sparklines + activity timeline + customize button + prefs filtering)
src/components/erp/dashboard-customize.tsx    ← NEW (Round 6)
src/components/erp/register-view.tsx          (Import/Print/Bulk/Workflow/Saved Views/Detail Drawer + permission gating + stats strip + empty state illustrations)
src/components/erp/record-form.tsx           (section grouping + progress bar)
src/components/erp/register-builder.tsx
src/components/erp/ai-assistant.tsx
src/components/erp/notifications-panel.tsx
src/components/erp/command-palette.tsx
src/components/erp/reports-view.tsx
src/components/erp/audit-logs-view.tsx        (shadcn Dialog + filters + stats + empty state illustration)
src/components/erp/settings-view.tsx
src/components/erp/csv-import.tsx             (Round 2)
src/components/erp/bulk-actions.tsx           (Round 2)
src/components/erp/print-record.tsx           (Round 2)
src/components/erp/login-screen.tsx           (Round 3)
src/components/erp/user-menu.tsx             (Round 3)
src/components/erp/users-view.tsx             (Round 3 + empty state illustration)
src/components/erp/approval-workflow.tsx       (Round 4)
src/components/erp/saved-views.tsx             (Round 4)
src/components/erp/sparkline.tsx               (Round 4)
src/components/erp/record-detail-drawer.tsx   (Round 5 + upgraded Round 6 with inline edit)
src/components/erp/empty-state-illustration.tsx (Round 5)
src/components/erp/icon.tsx
src/components/theme-provider.tsx
src/app/page.tsx
src/app/layout.tsx
src/app/globals.css
```

## Dev Server
- Runs on port 3000 via `bunx next dev -p 3000`
- Persistent launcher: `/home/z/my-project/start-dev.sh`
- Logs at `/home/z/my-project/dev.log`
- Current PID: 19464

## Demo Login Credentials
| Username | Password   | Role         | Department      | Visible Registers |
|----------|------------|--------------|-----------------|-------------------|
| admin    | admin123   | Super Admin  | IT              | All 30 (full access) |
| john     | john123    | Manager      | Administration   | Most (no Users/Settings) |
| ahmed    | ahmed123   | Technician   | Maintenance     | 6 Maintenance only |
| fatima   | fatima123  | HR           | Safety          | HR + Attendance + Visitors + Leave + Training |
| priya    | priya123   | Accountant   | Operations      | Vendors + Contracts + PR + Inventory + Reports |
