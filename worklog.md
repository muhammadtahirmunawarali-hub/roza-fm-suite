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
├── Transactions (records in registers + status transitions + workflow history + inline edit + CSV export + related records)
├── Reports (derived from register data)
├── Administration (Users, Roles, Audit Logs, Saved Views Management + Editing, Dashboard Prefs, System Stats)
└── Settings (theme, currency, document numbering, saved views, system stats, backup/reset)
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

## Round 9 — Status (2026-09-06)

### QA Findings (from start of Round 9)
- ✅ Verified all Round 8 features still work (Saved View editing with "Critical PRs Renamed", server-side permission checks on users CRUD)
- ✅ Login flow works (admin → dashboard)
- ✅ Settings → Saved Views tab shows 1 view with rename/delete buttons
- ✅ No console errors
- No new bugs found — system stable

### Work Focus This Round
Per Round 8 worklog's Priority 2 list, this round delivered 2 high-impact features:
1. **Related Records panel** — New "Related" tab in Record Detail Drawer showing linked records from other registers
2. **System Statistics widget** — Global stats grid in Settings → About tab

### What Was Done This Round

#### ✨ New Features

1. **Related Records panel** (in `record-detail-drawer.tsx`) — Priority 2:
   - **New "Related" tab** (4th tab after Details, History, Activity) in the Record Detail Drawer
   - **New API endpoint**: `GET /api/erp/registers/[id]/records/[recordId]/related`
     - Extracts reference values (employee, building, asset, equipment, vendor, department) from the current record
     - Searches all other registers for records that contain the same reference values
     - Returns grouped results by register with matched column + value info
   - **RelatedTab component**: Shows grouped results with:
     - Register header (colored icon + name + matching record count)
     - Each matching record: #sequence, first non-empty field value, "Matched: column = value" badge, relative timestamp
     - Total count: "N linked records in M registers"
   - **Empty state**: Custom SVG illustration when no related records found
   - **API client**: Added `recordsApi.getRelated()` method
   - **Verified**: PR #1 (John Smith, Administration) found 5 related records across 5 registers (Meeting Minutes, PTW, Contracts, SIV, Leave) — all matched on "John Smith" or "Administration"

2. **System Statistics widget** (in `settings-view.tsx` About tab) — Priority 2:
   - **New API endpoint**: `GET /api/erp/stats` — returns 12 global statistics in a single request
   - **Stats grid** in the About tab with 12 colored stat cards:
     - Registers (30), Records (93), Users (5), Active Users (5)
     - Audit Logs (27), Notifications (6), Unread Notifs (6), Saved Views (1)
     - Active Sessions (13), Settings (13), Dashboard Prefs (1), Inactive Users (0)
   - **StatCard component**: Colored icon + large bold number + uppercase label
   - **API client**: Added `statsApi.get()` method + `SystemStats` interface

#### 🎨 Styling Polish
- Related tab: Link2 icon for the tab button
- Related records: Register-colored icons, matched-column badge with accent background
- System stats: 12 colored stat cards in responsive grid (2/3/4 columns)
- StatCard: Hover effect with accent border transition

#### 🔧 Backend Updates
- **New API routes** (2):
  - `GET /api/erp/registers/[id]/records/[recordId]/related` — finds related records across other registers
  - `GET /api/erp/stats` — returns 12 global system statistics
- **API client**: Added `recordsApi.getRelated()` + `statsApi.get()` + `SystemStats` interface

### Verification Results (agent-browser)
- ✅ Login as admin → Purchase Request → View first record → "Related" tab visible (4th tab)
- ✅ Click "Related" → shows "LINKED RECORDS (5 IN 5 REGISTERS)" with 5 register groups
- ✅ Each group shows register icon + name + matched record # + "Matched: column = value" badge + timestamp
- ✅ Navigate to Settings → About tab → "System Statistics" grid shows 12 stat cards
- ✅ Stats show: 30 Registers, 93 Records, 5 Users, 27 Audit Logs, 13 Active Sessions, etc.
- ✅ `/api/erp/related` returns 200; `/api/erp/stats` returns 200
- ✅ Lint: 0 errors, 0 warnings
- ✅ Dev server stable (PID 25586)

### Files Modified/Created This Round
```
NEW: src/app/api/erp/registers/[id]/records/[recordId]/related/route.ts (related records search)
NEW: src/app/api/erp/stats/route.ts                              (global system statistics)
MODIFIED: src/lib/erp/api.ts                                      (added getRelated + statsApi + SystemStats)
MODIFIED: src/components/erp/record-detail-drawer.tsx             (added Related tab + RelatedTab component + Link2 import)
MODIFIED: src/components/erp/settings-view.tsx                    (added System Statistics grid in About tab + StatCard component)
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
- [DONE] Server-side permission checks on users CRUD (Round 8) — all user mutation endpoints validate session + role
- [DONE] Saved View editing (Round 8) — rename/update existing saved views
- [DONE] **Related Records panel** (Round 9) — shows linked records from other registers in the drawer
- [DONE] **System Statistics widget** (Round 9) — 12 global stats in Settings → About tab

## Unresolved Issues / Risks / Next-Phase Priorities

### Priority 1 — High-Value Features Still Missing
1. **Real-time notifications** — Currently poll-based when panel opens. Next phase: WebSocket mini-service (port 3003) for push notifications.

### Priority 2 — Polish & UX
2. **Custom field types** — Add support for file attachments, images, computed fields, and formula fields in the register builder.
3. **Drag-and-drop reorder** — Let users drag KPIs/charts to reorder them (currently only pin/hide is supported).
4. **Register builder improvements** — Required field validation, column reordering via drag-and-drop.

### Priority 3 — Performance & Scale
5. **Server-side filtering** — Currently register filter/sort happens in JS after fetching all records. Move to SQL with proper indexing for datasets >5000 records.
6. **Pagination virtualization** — For 100+ records per page, use windowing.
7. **CSV import streaming** — For large CSV files (>1000 rows), stream parsing instead of loading all into memory.

### Known Limitations
- Print record uses `window.open()` which may be blocked by popup blockers
- Bulk print limited to 5 records (browser limitation)
- AI Assistant context size limited to first 3 records per register
- Mobile sidebar drawer doesn't auto-close on navigation (intentional)
- **Passwords stored in plaintext** for demo only; production should use bcrypt/argon2
- **Session cookies are not signed**; production should add HMAC signing or JWT
- **Server-side permission checks** implemented on ALL mutation endpoints
- Dashboard preferences don't yet support drag-and-drop reordering (only pin/hide)
- Inline edit doesn't auto-save on field blur (intentional — user must click "Save Changes")
- Saved view editing currently only supports renaming and toggling shared/private
- Related records search is text-based (exact match); fuzzy matching would improve results

## Files Created (cumulative across all rounds)
```
prisma/schema.prisma                          (Register, Record, AuditLog, Setting, Notification, OpenTab, User, Session, SavedView, UserDashboardPref)
src/lib/erp/types.ts                          (ColumnType, ColumnDef, Register, RecordData, DashboardKPI+sparkline, etc.)
src/lib/erp/sample-data.ts                    (30 registers + 89 records extracted from DD.html)
src/lib/erp/api.ts                            (typed API client + all API methods)
src/lib/erp/store.ts                          (Zustand: tabs, theme, panels, builder, user, auth, hasPermission)
src/lib/erp/utils.ts                          (formatCurrency, formatDate, statusVariant, validateRecord, etc.)
src/lib/erp/seed.ts                           (seedDatabase, resetDatabase, getStats, ROLES, DEFAULT_USERS, getRolePermissions)
src/lib/erp/auth.ts                           (shared auth helper: getCurrentUser, hasPermission)
src/app/api/erp/registers/route.ts
src/app/api/erp/registers/[id]/route.ts
src/app/api/erp/registers/[id]/records/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/transition/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/history/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/related/route.ts   ← NEW (Round 9)
src/app/api/erp/registers/[id]/records/bulk/route.ts
src/app/api/erp/auth/login/route.ts
src/app/api/erp/auth/logout/route.ts
src/app/api/erp/auth/me/route.ts
src/app/api/erp/users/route.ts
src/app/api/erp/users/[id]/route.ts
src/app/api/erp/saved-views/route.ts
src/app/api/erp/saved-views/[id]/route.ts
src/app/api/erp/saved-views/all/route.ts
src/app/api/erp/dashboard/route.ts
src/app/api/erp/dashboard-prefs/route.ts
src/app/api/erp/audit-logs/route.ts
src/app/api/erp/settings/route.ts
src/app/api/erp/stats/route.ts                 ← NEW (Round 9)
src/app/api/erp/notifications/route.ts
src/app/api/erp/notifications/[id]/read/route.ts
src/app/api/erp/notifications/read-all/route.ts
src/app/api/erp/ai/route.ts
src/app/api/erp/search/route.ts
src/app/api/erp/master-data/route.ts
src/app/api/erp/backup/route.ts
src/app/api/erp/seed/route.ts
src/app/api/erp/reset/route.ts
src/components/erp/erp-shell.tsx
src/components/erp/sidebar.tsx
src/components/erp/toolbar.tsx
src/components/erp/tab-bar.tsx
src/components/erp/status-bar.tsx
src/components/erp/dashboard.tsx
src/components/erp/dashboard-customize.tsx
src/components/erp/register-view.tsx
src/components/erp/record-form.tsx
src/components/erp/register-builder.tsx
src/components/erp/ai-assistant.tsx
src/components/erp/notifications-panel.tsx
src/components/erp/command-palette.tsx
src/components/erp/reports-view.tsx
src/components/erp/audit-logs-view.tsx
src/components/erp/settings-view.tsx            (upgraded Round 9: System Stats)
src/components/erp/csv-import.tsx
src/components/erp/bulk-actions.tsx
src/components/erp/print-record.tsx
src/components/erp/login-screen.tsx
src/components/erp/user-menu.tsx
src/components/erp/users-view.tsx
src/components/erp/approval-workflow.tsx
src/components/erp/saved-views.tsx
src/components/erp/sparkline.tsx
src/components/erp/record-detail-drawer.tsx    (upgraded Round 9: Related tab)
src/components/erp/empty-state-illustration.tsx
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
- Current PID: 25586

## Demo Login Credentials
| Username | Password   | Role         | Department      | Visible Registers |
|----------|------------|--------------|-----------------|-------------------|
| admin    | admin123   | Super Admin  | IT              | All 30 (full access) |
| john     | john123    | Manager      | Administration   | Most (no Users/Settings) |
| ahmed    | ahmed123   | Technician   | Maintenance     | 6 Maintenance only |
| fatima   | fatima123  | HR           | Safety          | HR + Attendance + Visitors + Leave + Training |
| priya    | priya123   | Accountant   | Operations      | Vendors + Contracts + PR + Inventory + Reports |
