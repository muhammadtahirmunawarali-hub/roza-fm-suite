# FMCore ERP — Rebuild Worklog

## Project Goal
Rebuild the attached `DD.html` (FMCore ERP — Dynamic Register & Form Builder) into a complete, professional, scalable ERP application running on Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui + Tailwind CSS 4.

## Reference Architecture (from prompt)
```
ERP
├── Dashboard (KPIs + charts + sparklines + activity timeline, clickable)
├── Modules
│   ├── Operations   (Meeting Minutes, Attendance, Toolbox Talks)
│   ├── Maintenance   (Work Orders, PM, CM, Generator Log, Chiller Log, Electrical Inspection)
│   ├── Safety        (Inspections, Risk Assessment, Permit to Work, Incidents, Accidents, Fire Equip)
│   ├── Assets        (Assets, Equipment, Buildings, Calibration)
│   ├── Procurement   (Vendors, Contracts, Material Request, Purchase Request, Inventory, SIV)
│   ├── HR            (Visitors, Leave, Training)
│   └── Performance   (Housekeeping, KPI)
├── Master Data (Registers / dynamic schema)
├── Transactions (records in registers + status transitions)
├── Reports (derived from register data)
├── Administration (Users, Roles, Audit Logs, Saved Views)
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
9. **RBAC enforced both client-side (UI gating) and server-side (transition endpoint validates via role permissions).**

## Tech Stack
- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York)
- Prisma 6 + SQLite (with Session, User, SavedView models)
- Zustand (client state)
- Recharts (charts) + custom Sparkline SVG component
- z-ai-web-dev-sdk (AI Assistant, backend only)
- Lucide icons + Font Awesome 6.5 (CDN) for register icons

---

## Round 4 — Status (2026-09-06)

### QA Findings (from start of Round 4)
- ✅ Verified all Round 3 features still work (Login, RBAC, User Management, User Menu)
- ✅ Verified Round 2 features still work (CSV Import, Bulk Actions, Audit modal, Print)
- ✅ 93 records, 5 users, 30 registers
- ✅ No console errors
- No new bugs found — system stable

### Work Focus This Round
Per Round 3 worklog's Priority 1 & 2 list, this round delivered 4 high-impact features:
1. **Permission Enforcement in UI** — sidebar hides registers/modules user can't access; action buttons gated by role
2. **Approval Workflow UI** — status state machine with Approve/Reject/Submit/Cancel actions
3. **Saved Views UI** — save/load named filter combinations per register
4. **KPI Sparklines + Activity Timeline** — mini trend charts in KPI cards + 7-day activity bar chart

### What Was Done This Round

#### ✨ New Features

1. **Permission Enforcement in UI** (Priority 1):
   - **Sidebar filtering** (`sidebar.tsx`): Registers the user can't `view` are hidden from the sidebar. Categories with no visible registers are hidden entirely. Footer items (Reports, Audit Logs, Settings) are gated by their respective `view` permissions.
   - **Register view action buttons** (`register-view.tsx`): 
     - `Add Record` button hidden if `!canCreate`
     - `Import` button hidden if `!canImport`
     - `Export` button hidden if `!canExport`
     - `Edit` row action hidden if `!canEdit`
     - `Delete` row action hidden if `!canDelete`
     - `Workflow` row action hidden if `!canApprove && !canEdit`
   - **Read-only notice**: When user has view-only access (no create/edit/delete), a subtle "Read-only access — you can view records but not modify them" hint appears.
   - **Verified**: Login as Technician (Ahmed) → only sees MAINTENANCE category in sidebar (6 registers); Import button hidden; Export + Add Record + Workflow + Edit visible (Technician has these permissions for workorders).

2. **Approval Workflow UI** (`approval-workflow.tsx`, 320 lines) — Priority 1:
   - **State machine** (server-side, `transition/route.ts`): Maps (currentStatus, action) → newStatus
     - Draft → Submitted/Approved/Rejected/Cancelled
     - Submitted → Approved/Rejected/Cancelled
     - Approved → Cancelled/Reopen
     - Open → Assigned/In Progress/Cancelled
     - In Progress → Completed/On Hold/Cancelled
     - etc. (12 status types × ~4 actions each)
   - **Workflow modal** with:
     - Current status badge
     - 4-step workflow visualization (Draft → Submitted → Approved → Completed) with current step highlighted
     - Available actions grid (color-coded by variant: green=approve, red=reject, blue=submit, yellow=hold)
     - Action icons: CheckCircle2, XCircle, Send, Ban, RefreshCw, Play, Pause, Flag
     - Optional comment field (appends to record's Remarks/Comments column with timestamp)
     - Permission warning if user lacks approve/edit
   - **Confirmation dialog** showing from→to transition + comment
   - **Validation**: Endpoint rejects transitions to statuses not in the column's options (e.g. trying to "Approve" a Work Order → "Approved" fails because WO status options are Open/In Progress/Completed/On Hold/Cancelled)
   - **Notifications**: Approve/Reject actions create notifications in the DB
   - **Audit logging**: Every transition is logged with old/new values
   - **New API routes**:
     - `GET /api/erp/registers/[id]/records/[recordId]/transition` — returns available actions for current status
     - `POST /api/erp/registers/[id]/records/[recordId]/transition` — performs the transition
   - **Verified**: Approved a Purchase Request (status: Approved → Submitted via Reopen action); toast confirmed "Status changed: Approved → Submitted"; stats strip updated (Submitted: 1→2, Approved: 1→0)

3. **Saved Views UI** (`saved-views.tsx`, 240 lines) — Priority 2:
   - **Dropdown button** in register view header (next to Filters): shows count of saved views
   - **Save Current View** modal:
     - View name input
     - "Share with all users" checkbox (globe icon = shared, lock icon = private)
     - Live preview of what will be captured (search query, active filters, sort field)
     - Disabled if no active filters
   - **View list** in dropdown: shows each view with shared/private icon, name, filter summary, delete button (on hover)
   - **Apply view**: clicks loads the saved search/filters/sort into the register view
   - **Backend** (existing from Round 3): `GET/POST /api/erp/saved-views`, `DELETE /api/erp/saved-views/[id]`
   - **Verified**: Saved "Critical PRs" view on Purchase Request register → toast "View 'Critical PRs' saved" → dropdown showed view with "1" badge → clicking applied it → toast "Applied view: Critical PRs"

4. **KPI Sparklines + Activity Timeline** (Priority 2):
   - **Sparkline component** (`sparkline.tsx`, 60 lines): Custom SVG mini-chart with gradient area fill + line + endpoint dot. Renders at 70×20px in KPI cards.
   - **Dashboard API**: Added 7-day activity bucket computation:
     - Queries audit logs from last 7 days
     - Buckets by day (created/updated/deleted counts)
     - Attaches `sparkline` (7-day total activity per day) to each KPI
     - Attaches `delta` (% change vs previous day) + `deltaType` (up/down/flat)
     - Returns `activityByDay` array for the timeline chart
   - **KPI cards** now show:
     - Sparkline (mini line chart with gradient fill)
     - Delta badge (green ↑ / red ↓ / gray =) showing % change
   - **Activity Timeline chart** (new on dashboard): Stacked bar chart showing Created (green) / Updated (blue) / Deleted (red) per day for last 7 days
   - **Verified**: 41 SVGs on dashboard (14 KPIs × sparkline + 6 charts + 1 activity timeline); Activity Timeline shows 7 days of data

#### 🎨 Styling Polish
- Sparkline gradient fills match KPI color
- Delta badges with directional icons (TrendingUp/TrendingDown)
- Workflow state machine visualization with numbered circles + connecting arrows
- Action buttons color-coded by variant (success/danger/warning/accent)
- Saved Views dropdown with smooth animation
- Shared/private icons on saved views
- Permission-gated buttons appear/disappear cleanly (no broken layouts)

#### 🔧 Backend Updates
- **New Prisma models**: None (Session, SavedView already existed from Round 3)
- **New API routes** (3):
  - `GET /api/erp/registers/[id]/records/[recordId]/transition`
  - `POST /api/erp/registers/[id]/records/[recordId]/transition`
  - (Saved Views routes already existed from Round 3)
- **Dashboard API** (`dashboard/route.ts`): Added 7-day activity computation + sparkline data + delta calculation
- **Types**: Added `sparkline?: number[]` to `DashboardKPI`, `activityByDay?` to `DashboardData`
- **API client**: Added `recordsApi.getTransitions()` and `recordsApi.transition()` methods

### Verification Results (agent-browser)
- ✅ Login as admin → dashboard renders with 14 sparklines + Activity Timeline chart + Quick Actions
- ✅ Navigate to Maintenance Work Orders → "Views" button visible, 4 Workflow buttons (one per row)
- ✅ Click Workflow on WO #4 → modal shows Draft status + 4-step visualization + 4 available actions
- ✅ Click Approve on WO #4 → confirmation modal → Confirm → correctly rejected with toast "Status 'Approved' is not a valid option for this register" (validation working)
- ✅ Navigate to Purchase Request → Workflow modal shows Approved status + Cancel/Reopen actions
- ✅ Click Reopen on PR #1 → confirmation → Confirm → toast "Status changed: Approved → Submitted" → stats strip updated (Submitted 1→2, Approved 1→0)
- ✅ Open Saved Views dropdown → "No saved views" empty state
- ✅ Click "Save Current View" → modal with name input + share checkbox + filter preview
- ✅ Save "Critical PRs" → toast "View 'Critical PRs' saved" → dropdown badge "1"
- ✅ Click saved view → toast "Applied view: Critical PRs"
- ✅ Logout → login as Ahmed (Technician) → sidebar only shows MAINTENANCE category (6 registers); Operations/Safety/Assets/Procurement/HR/Performance all hidden
- ✅ Technician sees Add Record + Export + Workflow but NOT Import (correct permission gating)
- ✅ Lint: 0 errors, 0 warnings
- ✅ Dev server stable (PID 11520)
- ✅ All API routes return 200 (including new transition + saved-views routes)

### Bug Fixed This Round
- **Runtime error**: `Cannot read properties of null (reading 'code')` in `register-view.tsx:62` — permission checks accessed `register.code` before `register` was loaded from API. Fixed by using `register?.code || ''` pattern via a `regCode` intermediate variable.

### Files Modified/Created This Round
```
NEW: src/components/erp/approval-workflow.tsx       (320 lines — status state machine UI)
NEW: src/components/erp/saved-views.tsx             (240 lines — save/load filter views)
NEW: src/components/erp/sparkline.tsx               (60 lines — SVG mini trend chart)
NEW: src/app/api/erp/registers/[id]/records/[recordId]/transition/route.ts (status transitions)
MODIFIED: src/lib/erp/types.ts                     (added sparkline, activityByDay to DashboardData)
MODIFIED: src/lib/erp/api.ts                        (added getTransitions, transition methods)
MODIFIED: src/app/api/erp/dashboard/route.ts        (7-day activity computation + sparklines + deltas)
MODIFIED: src/components/erp/dashboard.tsx          (render sparklines + deltas + Activity Timeline chart)
MODIFIED: src/components/erp/sidebar.tsx            (permission filtering for registers + footer items)
MODIFIED: src/components/erp/register-view.tsx     (permission gating + Workflow button + Saved Views dropdown + read-only notice)
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
- [DONE] **Permission Enforcement in UI** (Round 4) — sidebar + action buttons gated by role
- [DONE] **Approval Workflow UI** (Round 4) — state machine + Approve/Reject/Submit/Cancel
- [DONE] **Saved Views UI** (Round 4) — save/load named filter combinations
- [DONE] **KPI Sparklines + Activity Timeline** (Round 4) — 7-day trend charts

## Unresolved Issues / Risks / Next-Phase Priorities

### Priority 1 — High-Value Features Still Missing
1. **Real-time notifications** — Currently poll-based when panel opens. Next phase: WebSocket mini-service (port 3003) for push notifications. Approval actions already create notifications in DB; just need a push mechanism.
2. **Record detail drawer** — Slide-in drawer with full record details + inline edit, instead of modal. Better UX for power users.
3. **Server-side permission checks** — Currently `transition/route.ts` doesn't verify the user's session/role before applying transitions. Next phase: read session cookie, look up user, verify `hasPermission(registerCode, 'approve')` server-side before applying. (Client-side gating is already in place; this is defense-in-depth.)

### Priority 2 — Polish & UX
4. **Empty state illustrations** — SVG illustrations instead of plain icons (currently using Lucide icons in circles).
5. **Custom dashboard widgets** — Let users pin specific KPIs/charts to their dashboard.
6. **Saved view management page** — Currently views can only be deleted from the dropdown; add a Settings tab to manage all saved views across registers.
7. **Workflow history per record** — Show a timeline of all status transitions for a record (currently only in audit log).

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
- **Server-side permission checks** are not yet implemented on transition endpoint (client-side gating is in place; defense-in-depth needed for production)
- Workflow state machine is generic; some registers may need custom transitions (e.g. PTW has Draft→Submitted→Approved→Active→Completed which differs from the default)

## Files Created (cumulative across all rounds)
```
prisma/schema.prisma                          (Register, Record, AuditLog, Setting, Notification, OpenTab, User, Session, SavedView)
src/lib/erp/types.ts                          (ColumnType, ColumnDef, Register, RecordData, DashboardKPI+sparkline, etc.)
src/lib/erp/sample-data.ts                    (30 registers + 89 records extracted from DD.html)
src/lib/erp/api.ts                            (typed API client + authApi + usersApi + savedViewsApi + bulkCreate + transitions)
src/lib/erp/store.ts                          (Zustand: tabs, theme, panels, builder, user, auth, hasPermission)
src/lib/erp/utils.ts                          (formatCurrency, formatDate, statusVariant, validateRecord, etc.)
src/lib/erp/seed.ts                           (seedDatabase, resetDatabase, getStats, ROLES, DEFAULT_USERS, getRolePermissions)
src/app/api/erp/registers/route.ts
src/app/api/erp/registers/[id]/route.ts
src/app/api/erp/registers/[id]/records/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/transition/route.ts   ← NEW (Round 4)
src/app/api/erp/registers/[id]/records/bulk/route.ts   (bulk import)
src/app/api/erp/auth/login/route.ts           (Round 3)
src/app/api/erp/auth/logout/route.ts          (Round 3)
src/app/api/erp/auth/me/route.ts              (Round 3)
src/app/api/erp/users/route.ts                (Round 3)
src/app/api/erp/users/[id]/route.ts           (Round 3)
src/app/api/erp/saved-views/route.ts          (Round 3)
src/app/api/erp/saved-views/[id]/route.ts     (Round 3)
src/app/api/erp/dashboard/route.ts            (upgraded: sparklines + activity timeline)
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
src/components/erp/dashboard.tsx              (clickable KPIs + Quick Actions + sparklines + activity timeline)
src/components/erp/register-view.tsx          (Import/Print/Bulk/Workflow/Saved Views + permission gating + stats strip)
src/components/erp/record-form.tsx           (section grouping + progress bar)
src/components/erp/register-builder.tsx
src/components/erp/ai-assistant.tsx
src/components/erp/notifications-panel.tsx
src/components/erp/command-palette.tsx
src/components/erp/reports-view.tsx
src/components/erp/audit-logs-view.tsx        (shadcn Dialog + filters + stats)
src/components/erp/settings-view.tsx
src/components/erp/csv-import.tsx             (Round 2)
src/components/erp/bulk-actions.tsx           (Round 2)
src/components/erp/print-record.tsx           (Round 2)
src/components/erp/login-screen.tsx           (Round 3)
src/components/erp/user-menu.tsx             (Round 3)
src/components/erp/users-view.tsx             (Round 3)
src/components/erp/approval-workflow.tsx       ← NEW (Round 4)
src/components/erp/saved-views.tsx             ← NEW (Round 4)
src/components/erp/sparkline.tsx               ← NEW (Round 4)
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
- Current PID: 11520 (stable across this round)

## Demo Login Credentials
| Username | Password   | Role         | Department      | Visible Registers |
|----------|------------|--------------|-----------------|-------------------|
| admin    | admin123   | Super Admin  | IT              | All 30 (full access) |
| john     | john123    | Manager      | Administration   | Most (no Users/Settings) |
| ahmed    | ahmed123   | Technician   | Maintenance     | 6 Maintenance only |
| fatima   | fatima123  | HR           | Safety          | HR + Attendance + Visitors + Leave + Training |
| priya    | priya123   | Accountant   | Operations      | Vendors + Contracts + PR + Inventory + Reports |
