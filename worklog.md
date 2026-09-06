# FMCore ERP — Rebuild Worklog

## Project Goal
Rebuild the attached `DD.html` (FMCore ERP — Dynamic Register & Form Builder) into a complete, professional, scalable ERP application running on Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui + Tailwind CSS 4.

## Reference Architecture (from prompt)
```
ERP
├── Dashboard (KPIs + charts + sparklines + activity timeline + system overview, clickable, customizable)
├── Modules
│   ├── Operations   (Meeting Minutes, Attendance, Toolbox Talks)
│   ├── Maintenance   (Work Orders, PM, CM, Generator Log, Chiller Log, Electrical Inspection)
│   ├── Safety        (Inspections, Risk Assessment, Permit to Work, Incidents, Accidents, Fire Equip)
│   ├── Assets        (Assets, Equipment, Buildings, Calibration)
│   ├── Procurement   (Vendors, Contracts, Material Request, Purchase Request, Inventory, SIV)
│   ├── HR            (Visitors, Leave, Training)
│   └── Performance   (Housekeeping, KPI)
├── Master Data (Registers / dynamic schema)
├── Transactions (records in registers + status transitions + workflow history + inline edit + CSV/JSON export + related records)
├── Reports (derived from register data)
├── Administration (Users, Roles, Audit Logs, Saved Views Management + Editing, Dashboard Prefs, System Stats, Keyboard Shortcuts)
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
- Recharts (charts) + custom Sparkline SVG component + EmptyStateIllustration SVG component + SystemOverviewWidget
- z-ai-web-dev-sdk (AI Assistant, backend only)
- Lucide icons + Font Awesome 6.5 (CDN) for register icons

---

## Round 10 — Status (2026-09-06)

### QA Findings (from start of Round 10)
- ✅ Verified all Round 9 features still work (Related Records tab showing 5 linked records, System Statistics grid in About tab)
- ✅ Login flow works (admin → dashboard)
- ✅ No console errors
- No new bugs found — system stable

### Work Focus This Round
This round delivered 3 high-impact features:
1. **JSON Export** — Export register data as JSON alongside existing CSV export
2. **Keyboard Shortcuts Help Modal** — Document all shortcuts, accessible via Ctrl+/
3. **System Overview Widget** — Live stats card on the dashboard showing registers, records, users, sessions, alerts, audit logs

### What Was Done This Round

#### ✨ New Features

1. **JSON Export from register view** (`register-view.tsx`):
   - **Export dropdown** (hover-to-show) replaces the single "Export" button
   - Two options: "Export as CSV" (existing) and "Export as JSON" (new)
   - **JSON format**: Includes register metadata (name, code, category, columns) + export timestamp + record count + full record data (id, sequence, data, timestamps, createdBy/updatedBy)
   - **Download**: `.json` file with pretty-printed JSON
   - **Toast confirmation**: "Exported N records to JSON"
   - Uses `Braces` icon (lucide) for the JSON option

2. **Keyboard Shortcuts Help Modal** (`keyboard-shortcuts.tsx`, 90 lines):
   - **New component**: Modal dialog documenting all keyboard shortcuts
   - **Trigger**: Ctrl+/ (or Cmd+/ on Mac) — registered as a global keyboard event listener in `erp-shell.tsx`
   - **5 categories**: Navigation, Toolbar Actions, Register View, Record Detail Drawer, Forms
   - **Each shortcut**: Icon + description + `<kbd>` key badges
   - **Shortcuts documented**: Ctrl+K (command palette), Esc (close), Click actions (AI, notifications, theme, customize), column sorting, search, row selection, tab switching, form submission

3. **System Overview Widget** (`system-overview-widget.tsx`, 70 lines):
   - **New dashboard widget**: Compact card showing 6 key system metrics
   - **Live indicator**: Green pulsing dot with "Live" text
   - **6 stat cards in responsive grid** (3 cols on mobile, 6 cols on desktop):
     - Registers (30), Records (93), Users (5), Sessions (15), Alerts (unread notifications), Audit Logs
   - **Color-coded icons**: Each stat has its own colored icon
   - **Placement**: Between Quick Actions panel and Charts row 1 on the dashboard
   - Uses existing `/api/erp/stats` endpoint from Round 9

#### 🎨 Styling Polish
- Export dropdown: Clean hover-to-show dropdown with border separator between CSV and JSON options
- Keyboard shortcuts: `<kbd>` badges with monospace font, category headers with divider lines
- System overview: Live pulse animation, color-coded stat icons, hover effect on stat cards
- Dashboard layout: System Overview widget adds a quick-glance stats row between Quick Actions and Charts

#### 🔧 Backend Updates
- No new API routes (uses existing `/api/erp/stats` endpoint from Round 9)
- **API client**: Added `exportJson()` function in `register-view.tsx` (client-side blob generation)

### Verification Results (agent-browser)
- ✅ Login as admin → Dashboard shows "SYSTEM OVERVIEW / Live" with 6 stat cards (30 REGISTERS, 93 RECORDS, 5 USERS, 15 SESSIONS, Alerts, Audit)
- ✅ Press Ctrl+/ → Keyboard Shortcuts modal opens with 5 categories and kbd badges
- ✅ Navigate to Purchase Request → Export button shows dropdown with "Export as CSV" + "Export as JSON"
- ✅ `/api/erp/stats` returns 200 with all 12 system statistics
- ✅ Lint: 0 errors, 0 warnings
- ✅ Dev server stable (PID 27748)

### Files Modified/Created This Round
```
NEW: src/components/erp/keyboard-shortcuts.tsx        (90 lines — shortcuts help modal)
NEW: src/components/erp/system-overview-widget.tsx    (70 lines — live stats card on dashboard)
MODIFIED: src/components/erp/register-view.tsx        (added exportJson + Export dropdown with CSV/JSON options + ChevronDown + Braces imports)
MODIFIED: src/components/erp/dashboard.tsx             (added SystemOverviewWidget between Quick Actions and Charts)
MODIFIED: src/components/erp/erp-shell.tsx             (added KeyboardShortcuts modal + Ctrl+/ handler + useState import)
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
- [DONE] Permission Enforcement in UI (Round 4)
- [DONE] Approval Workflow UI (Round 4)
- [DONE] Saved Views UI (Round 4)
- [DONE] KPI Sparklines + Activity Timeline (Round 4)
- [DONE] Record Detail Drawer (Round 5)
- [DONE] Workflow History timeline (Round 5)
- [DONE] Server-side permission checks (Round 5)
- [DONE] Empty state SVG illustrations (Round 5)
- [DONE] Inline Edit in Record Detail Drawer (Round 6)
- [DONE] Custom Dashboard Widgets (Round 6)
- [DONE] Saved Views Management page (Round 7)
- [DONE] Server-side permission checks on records CRUD (Round 7)
- [DONE] Workflow History CSV export (Round 7)
- [DONE] Server-side permission checks on users CRUD (Round 8)
- [DONE] Saved View editing (Round 8)
- [DONE] Related Records panel (Round 9)
- [DONE] System Statistics widget (Round 9)
- [DONE] **JSON Export from register view** (Round 10) — data portability alongside CSV
- [DONE] **Keyboard Shortcuts Help Modal** (Round 10) — Ctrl+/ shows all shortcuts
- [DONE] **System Overview Widget** (Round 10) — live stats card on dashboard

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
- Inline edit doesn't auto-save on field blur (intentional)
- Related records search is text-based (exact match); fuzzy matching would improve results
- Export dropdown uses CSS hover (group-hover) — not accessible via keyboard (future: convert to proper dropdown menu)

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
src/app/api/erp/registers/[id]/records/[recordId]/related/route.ts   (Round 9)
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
src/app/api/erp/stats/route.ts                 (Round 9)
src/app/api/erp/notifications/route.ts
src/app/api/erp/notifications/[id]/read/route.ts
src/app/api/erp/notifications/read-all/route.ts
src/app/api/erp/ai/route.ts
src/app/api/erp/search/route.ts
src/app/api/erp/master-data/route.ts
src/app/api/erp/backup/route.ts
src/app/api/erp/seed/route.ts
src/app/api/erp/reset/route.ts
src/components/erp/erp-shell.tsx               (upgraded Round 10: shortcuts modal + Ctrl+/)
src/components/erp/sidebar.tsx
src/components/erp/toolbar.tsx
src/components/erp/tab-bar.tsx
src/components/erp/status-bar.tsx
src/components/erp/dashboard.tsx              (upgraded Round 10: System Overview Widget)
src/components/erp/dashboard-customize.tsx
src/components/erp/system-overview-widget.tsx  ← NEW (Round 10)
src/components/erp/register-view.tsx          (upgraded Round 10: JSON export + dropdown)
src/components/erp/record-form.tsx
src/components/erp/register-builder.tsx
src/components/erp/ai-assistant.tsx
src/components/erp/notifications-panel.tsx
src/components/erp/command-palette.tsx
src/components/erp/keyboard-shortcuts.tsx      ← NEW (Round 10)
src/components/erp/reports-view.tsx
src/components/erp/audit-logs-view.tsx
src/components/erp/settings-view.tsx
src/components/erp/csv-import.tsx
src/components/erp/bulk-actions.tsx
src/components/erp/print-record.tsx
src/components/erp/login-screen.tsx
src/components/erp/user-menu.tsx
src/components/erp/users-view.tsx
src/components/erp/approval-workflow.tsx
src/components/erp/saved-views.tsx
src/components/erp/sparkline.tsx
src/components/erp/record-detail-drawer.tsx
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
- Current PID: 27748

## Demo Login Credentials
| Username | Password   | Role         | Department      | Visible Registers |
|----------|------------|--------------|-----------------|-------------------|
| admin    | admin123   | Super Admin  | IT              | All 30 (full access) |
| john     | john123    | Manager      | Administration   | Most (no Users/Settings) |
| ahmed    | ahmed123   | Technician   | Maintenance     | 6 Maintenance only |
| fatima   | fatima123  | HR           | Safety          | HR + Attendance + Visitors + Leave + Training |
| priya    | priya123   | Accountant   | Operations      | Vendors + Contracts + PR + Inventory + Reports |
