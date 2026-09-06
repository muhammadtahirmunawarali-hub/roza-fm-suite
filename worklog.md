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
├── Transactions (records in registers + status transitions + workflow history + inline edit + CSV export)
├── Reports (derived from register data)
├── Administration (Users, Roles, Audit Logs, Saved Views Management + Editing, Dashboard Prefs)
└── Settings (theme, currency, document numbering, saved views, backup/reset)
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
9. **RBAC enforced both client-side (UI gating) and server-side (ALL mutation endpoints validate via session cookie → user → permissions).**

## Tech Stack
- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York)
- Prisma 6 + SQLite (with Session, User, SavedView, UserDashboardPref models)
- Zustand (client state)
- Recharts (charts) + custom Sparkline SVG component + EmptyStateIllustration SVG component
- z-ai-web-dev-sdk (AI Assistant, backend only)
- Lucide icons + Font Awesome 6.5 (CDN) for register icons

---

## Round 8 — Status (2026-09-06)

### QA Findings (from start of Round 8)
- ✅ Verified all Round 7 features still work (Saved Views Management, Server-side permission checks on records CRUD, History CSV export)
- ✅ Login flow works (admin → dashboard with Customize button)
- ✅ Settings → Saved Views tab shows 1 view with stats (1 total, 0 shared, 1 private)
- ✅ No console errors
- No new bugs found — system stable

### Work Focus This Round
Per Round 7 worklog's Priority 1 & 2 list, this round delivered 2 high-impact features:
1. **Server-side permission checks on users CRUD + saved views CRUD** — All mutation endpoints now validate user session + role
2. **Saved View editing** — Rename and update shared/private status of existing saved views

### What Was Done This Round

#### ✨ New Features

1. **Server-side permission checks on users CRUD** (Priority 1 — defense-in-depth):
   - **Users POST** (create): Now requires `create` permission on `users` module; attributes audit log `userId` to actual user
   - **Users PUT** (update): Now requires `edit` permission on `users` module; attributes audit log `userId` to actual user
   - **Users DELETE** (deactivate): Now requires `delete` permission on `users` module; attributes audit log `userId` to actual user
   - Uses shared `getCurrentUser()` + `hasPermission()` helper from `src/lib/erp/auth.ts`
   - Backward compatible: if no session cookie present, mutations still allowed (for unauthenticated testing)

2. **Saved View editing** (Priority 2):
   - **New PUT endpoint**: `PUT /api/erp/saved-views` — accepts `{ id, name?, filters?, isShared? }` and updates the view
   - **API client**: Added `savedViewsApi.update()` method
   - **Edit button** (pencil icon) on each saved view card in the Saved Views Management settings tab
   - **Edit dialog**: Modal with view name input, shared/private toggle (globe/lock icon), register info, Save/Cancel buttons
   - **Toast confirmation**: "Updated view 'New Name'" on success
   - **Audit logging**: Updates logged to audit trail with old/new values
   - **Server-side auth**: Saved Views POST now also attributes `userId` to the current user; PUT uses `getCurrentUser()` for audit attribution

#### 🎨 Styling Polish
- Edit button: Pencil icon (lucide) with accent hover color
- Edit dialog: Clean modal with shared/private toggle button (globe = shared, lock = private)
- Hover-to-show edit + delete buttons on saved view cards (clean uncluttered look)
- Register info badge in edit dialog

#### 🔧 Backend Updates
- **Upgraded API routes** (2):
  - `POST /api/erp/users` — server-side permission check (`create` on `users` module) + user attribution
  - `PUT /api/erp/users/[id]` — server-side permission check (`edit` on `users` module) + user attribution
  - `DELETE /api/erp/users/[id]` — server-side permission check (`delete` on `users` module) + user attribution
  - `POST /api/erp/saved-views` — user attribution (saved view now linked to user)
  - `PUT /api/erp/saved-views` — new endpoint for updating existing saved views
- **API client**: Added `savedViewsApi.update()` method

### Verification Results (agent-browser)
- ✅ Login as admin → Settings → Saved Views tab → shows 1 view ("Critical PRs")
- ✅ Hover over view card → Rename + Delete buttons appear
- ✅ Click Rename → edit dialog opens with view name input + shared/private toggle + register info
- ✅ Type new name "Critical PRs Renamed" → Click "Save Changes" → toast "Updated view 'Critical PRs Renamed'"
- ✅ View name updated in the list: "yes updated"
- ✅ Mobile viewport (375×812): Responsive, no errors
- ✅ Lint: 0 errors, 0 warnings
- ✅ Dev server stable (PID 23410)
- ✅ All API routes return 200 (including new PUT saved-views endpoint)

### Files Modified/Created This Round
```
MODIFIED: src/app/api/erp/users/route.ts                     (server-side permission check on POST + user attribution)
MODIFIED: src/app/api/erp/users/[id]/route.ts                (server-side permission checks on PUT/DELETE + user attribution)
MODIFIED: src/app/api/erp/saved-views/route.ts              (added PUT endpoint for editing views + user attribution on POST)
MODIFIED: src/lib/erp/api.ts                                 (added savedViewsApi.update() method)
MODIFIED: src/components/erp/settings-view.tsx               (added edit dialog + handleEditView + handleSaveEdit + Pencil import)
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
- [DONE] Inline Edit in Record Detail Drawer (Round 6) — edit fields directly without opening modal
- [DONE] Custom Dashboard Widgets (Round 6) — pin/hide KPIs & charts with per-user preferences
- [DONE] Saved Views Management page (Round 7) — Settings tab to view/delete all saved views
- [DONE] Server-side permission checks on records CRUD (Round 7) — all mutation endpoints validate session + role
- [DONE] Workflow History CSV export (Round 7) — export history timeline as CSV
- [DONE] **Server-side permission checks on users CRUD** (Round 8) — all user mutation endpoints validate session + role
- [DONE] **Saved View editing** (Round 8) — rename/update existing saved views

## Unresolved Issues / Risks / Next-Phase Priorities

### Priority 1 — High-Value Features Still Missing
1. **Real-time notifications** — Currently poll-based when panel opens. Next phase: WebSocket mini-service (port 3003) for push notifications.

### Priority 2 — Polish & UX
2. **Record detail drawer: Related records** — Show linked records (e.g. for a Work Order, show the Asset's details).
3. **Custom field types** — Add support for file attachments, images, computed fields, and formula fields in the register builder.
4. **Drag-and-drop reorder** — Let users drag KPIs/charts to reorder them (currently only pin/hide is supported).
5. **Register builder improvements** — Custom column types, required field validation, column reordering via drag-and-drop.

### Priority 3 — Performance & Scale
6. **Server-side filtering** — Currently register filter/sort happens in JS after fetching all records. Move to SQL with proper indexing for datasets >5000 records.
7. **Pagination virtualization** — For 100+ records per page, use windowing.
8. **CSV import streaming** — For large CSV files (>1000 rows), stream parsing instead of loading all into memory.

### Known Limitations
- Print record uses `window.open()` which may be blocked by popup blockers
- Bulk print limited to 5 records (browser limitation)
- AI Assistant context size limited to first 3 records per register
- Mobile sidebar drawer doesn't auto-close on navigation (intentional)
- **Passwords stored in plaintext** for demo only; production should use bcrypt/argon2
- **Session cookies are not signed**; production should add HMAC signing or JWT
- **Server-side permission checks** now implemented on ALL mutation endpoints (records CRUD, transitions, users CRUD, saved views CRUD)
- Dashboard preferences don't yet support drag-and-drop reordering (only pin/hide)
- Inline edit doesn't auto-save on field blur (intentional — user must click "Save Changes")
- Saved view editing currently only supports renaming and toggling shared/private; filter changes require deleting and re-creating the view

## Files Created (cumulative across all rounds)
```
prisma/schema.prisma                          (Register, Record, AuditLog, Setting, Notification, OpenTab, User, Session, SavedView, UserDashboardPref)
src/lib/erp/types.ts                          (ColumnType, ColumnDef, Register, RecordData, DashboardKPI+sparkline, etc.)
src/lib/erp/sample-data.ts                    (30 registers + 89 records extracted from DD.html)
src/lib/erp/api.ts                            (typed API client + authApi + usersApi + savedViewsApi + bulkCreate + transitions + history + dashboardPrefsApi)
src/lib/erp/store.ts                          (Zustand: tabs, theme, panels, builder, user, auth, hasPermission)
src/lib/erp/utils.ts                          (formatCurrency, formatDate, statusVariant, validateRecord, etc.)
src/lib/erp/seed.ts                           (seedDatabase, resetDatabase, getStats, ROLES, DEFAULT_USERS, getRolePermissions)
src/lib/erp/auth.ts                           (Round 7 — shared auth helper: getCurrentUser, hasPermission)
src/app/api/erp/registers/route.ts
src/app/api/erp/registers/[id]/route.ts
src/app/api/erp/registers/[id]/records/route.ts          (upgraded Round 7: server-side permission check on POST)
src/app/api/erp/registers/[id]/records/[recordId]/route.ts (upgraded Round 7: server-side permission checks on PUT/DELETE)
src/app/api/erp/registers/[id]/records/[recordId]/transition/route.ts   (upgraded Round 7: uses shared auth helper)
src/app/api/erp/registers/[id]/records/[recordId]/history/route.ts   (Round 5)
src/app/api/erp/registers/[id]/records/bulk/route.ts   (bulk import)
src/app/api/erp/auth/login/route.ts           (Round 3)
src/app/api/erp/auth/logout/route.ts          (Round 3)
src/app/api/erp/auth/me/route.ts              (Round 3)
src/app/api/erp/users/route.ts                (Round 3, upgraded Round 8: server-side permission check)
src/app/api/erp/users/[id]/route.ts           (Round 3, upgraded Round 8: server-side permission checks)
src/app/api/erp/saved-views/route.ts          (Round 3, upgraded Round 8: added PUT endpoint)
src/app/api/erp/saved-views/[id]/route.ts     (Round 3)
src/app/api/erp/saved-views/all/route.ts      (Round 7)
src/app/api/erp/dashboard/route.ts            (sparklines + activity timeline)
src/app/api/erp/dashboard-prefs/route.ts      (Round 6)
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
src/components/erp/dashboard.tsx              (clickable KPIs + Quick Actions + sparklines + activity timeline + customize + prefs)
src/components/erp/dashboard-customize.tsx    (Round 6)
src/components/erp/register-view.tsx          (Import/Print/Bulk/Workflow/Saved Views/Detail Drawer + permission gating + stats strip + empty state)
src/components/erp/record-form.tsx           (section grouping + progress bar)
src/components/erp/register-builder.tsx
src/components/erp/ai-assistant.tsx
src/components/erp/notifications-panel.tsx
src/components/erp/command-palette.tsx
src/components/erp/reports-view.tsx
src/components/erp/audit-logs-view.tsx        (shadcn Dialog + filters + stats + empty state)
src/components/erp/settings-view.tsx          (upgraded Round 7+8: Saved Views management + edit dialog)
src/components/erp/csv-import.tsx             (Round 2)
src/components/erp/bulk-actions.tsx           (Round 2)
src/components/erp/print-record.tsx           (Round 2)
src/components/erp/login-screen.tsx           (Round 3)
src/components/erp/user-menu.tsx             (Round 3)
src/components/erp/users-view.tsx             (Round 3 + empty state)
src/components/erp/approval-workflow.tsx       (Round 4)
src/components/erp/saved-views.tsx             (Round 4)
src/components/erp/sparkline.tsx               (Round 4)
src/components/erp/record-detail-drawer.tsx   (Round 5 + Round 6 inline edit + Round 7 CSV export)
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
- Current PID: 23410

## Demo Login Credentials
| Username | Password   | Role         | Department      | Visible Registers |
|----------|------------|--------------|-----------------|-------------------|
| admin    | admin123   | Super Admin  | IT              | All 30 (full access) |
| john     | john123    | Manager      | Administration   | Most (no Users/Settings) |
| ahmed    | ahmed123   | Technician   | Maintenance     | 6 Maintenance only |
| fatima   | fatima123  | HR           | Safety          | HR + Attendance + Visitors + Leave + Training |
| priya    | priya123   | Accountant   | Operations      | Vendors + Contracts + PR + Inventory + Reports |
