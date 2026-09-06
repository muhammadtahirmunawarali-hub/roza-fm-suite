# FMCore ERP — Rebuild Worklog

## Project Goal
Rebuild the attached `DD.html` (FMCore ERP — Dynamic Register & Form Builder) into a complete, professional, scalable ERP application running on Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui + Tailwind CSS 4.

## Reference Architecture (from prompt)
```
ERP
├── Dashboard (KPIs + charts + sparklines + activity timeline + system overview + recent records, clickable, customizable)
├── Modules (30 registers across 7 categories)
├── Master Data (Registers / dynamic schema)
├── Transactions (records + status transitions + workflow history + inline edit + CSV/JSON export + related records)
├── Reports (derived from register data)
├── Administration (Users, Roles, Audit Logs, Saved Views, Dashboard Prefs, System Stats, Keyboard Shortcuts)
└── Settings (theme, currency, saved views, system stats, backup/reset)
```

## Core Design Decisions
1. Preserve "Dynamic Register & Form Builder" concept — schema-driven registers
2. Prisma + SQLite persistence (SaaS-ready)
3. API-first: every action hits `/api/erp/*` routes
4. Audit log on all mutations
5. Light/dark theme via Zustand
6. Responsive (mobile/tablet/desktop)
7. Cookie-based session auth (httpOnly, 7-day expiry)
8. RBAC enforced both client-side and server-side (ALL mutation endpoints)
9. 35+ API routes, 35+ components, 10 Prisma models

---

## Round 11 — Status (2026-09-06)

### QA Findings (from start of Round 11)
- ✅ Verified all Round 10 features (JSON Export, Keyboard Shortcuts, System Overview Widget)
- ✅ Login flow works (admin → dashboard with System Overview + Recent Records)
- ✅ No console errors
- No new bugs found — system stable

### Work Focus This Round
This round delivered 4 high-impact UX features:
1. **Column Visibility Toggle** — Show/hide columns in register view
2. **Quick Status Filter Pills** — One-click status filtering with count badges
3. **Notification Auto-Refresh** — Polls every 30s for new notifications
4. **Recent Records Widget** — Shows recent audit activity on dashboard with click-to-navigate

### What Was Done This Round

#### ✨ New Features

1. **Column Visibility Toggle** (`register-view.tsx`):
   - "Columns" button in the action bar with count badge showing hidden columns
   - Dropdown panel listing all columns with checkbox + type label
   - Toggling a column instantly hides/shows it in the table
   - "Show all columns" reset button when columns are hidden
   - Uses `visibleColumns` useMemo to filter both header and body cells
   - `Columns3` icon from lucide

2. **Quick Status Filter Pills** (`register-view.tsx`):
   - Pill-style quick filters above the table for status columns
   - Shows "All" pill + one pill per status option with record count badges
   - Clicking a pill instantly filters the table (no need to open the Filters panel)
   - Active pill highlighted with accent background
   - Only appears when register has a status column with options
   - Count badges show how many records match each status

3. **Notification Auto-Refresh** (`toolbar.tsx`):
   - Changed from load-once-when-panel-opens to polling every 30 seconds
   - Unread notification count badge stays current without manual refresh
   - Uses `setInterval` with 30s interval inside the notification loading effect
   - Properly cleaned up on unmount

4. **Recent Records Widget** (`recent-records-widget.tsx`, 110 lines):
   - New dashboard widget showing 6 most recent audit log entries (Created/Updated actions)
   - Color-coded action icons (green=Created, blue=Updated, red=Deleted, accent=Approved)
   - Each entry shows: action icon, summary, user name, module, relative timestamp
   - Click-to-navigate: clicking an entry opens the corresponding register
   - Skeleton loading state with staggered animation
   - Positioned in the 3-column grid alongside Recent Activity and Upcoming Items
   - Uses existing `/api/erp/audit-logs` endpoint

#### 🎨 Styling Polish
- Column toggle: Clean dropdown with checkbox + type label, hover effect, "Show all" reset
- Quick filter pills: Rounded pills with count badges, accent highlight for active filter
- Recent records: Color-coded action icons, arrow icon for clickable entries, skeleton loading
- Dashboard layout: Upgraded from 2-col to 3-col grid for Recent Records + Recent Activity + Upcoming

#### 🔧 Backend Updates
- No new API routes (uses existing audit-logs endpoint)
- Notification polling moved from on-demand to 30s interval in toolbar

### Verification Results (agent-browser)
- ✅ Dashboard shows "Recent Records" widget with 6 entries (Created/Updated actions)
- ✅ Dashboard shows "SYSTEM OVERVIEW" with Live indicator
- ✅ Navigate to Purchase Request → "Columns" button visible with count badge
- ✅ Click Columns → dropdown shows all 9 columns with type labels (auto increment, date, employee, etc.)
- ✅ Quick Filter pills show "All Draft(1) Submitted(2)" with count badges
- ✅ Lint: 0 errors, 0 warnings
- ✅ Dev server stable (PID 29799)
- ✅ All API routes return 200

### Files Modified/Created This Round
```
NEW: src/components/erp/recent-records-widget.tsx     (110 lines — recent audit entries on dashboard)
MODIFIED: src/components/erp/register-view.tsx        (added Column Visibility Toggle + Quick Filter Pills + visibleColumns + Columns3 import)
MODIFIED: src/components/erp/toolbar.tsx              (notification auto-refresh polling every 30s)
MODIFIED: src/components/erp/dashboard.tsx            (added RecentRecordsWidget + 3-col grid)
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
- [DONE] JSON Export from register view (Round 10)
- [DONE] Keyboard Shortcuts Help Modal (Round 10)
- [DONE] System Overview Widget (Round 10)
- [DONE] **Column Visibility Toggle** (Round 11) — show/hide columns in register view
- [DONE] **Quick Status Filter Pills** (Round 11) — one-click status filtering with counts
- [DONE] **Notification Auto-Refresh** (Round 11) — polls every 30s
- [DONE] **Recent Records Widget** (Round 11) — recent audit activity on dashboard

## Unresolved Issues / Risks / Next-Phase Priorities

### Priority 1 — High-Value Features Still Missing
1. **Real-time notifications** — Currently polls every 30s. Next phase: WebSocket mini-service (port 3003) for true push notifications.

### Priority 2 — Polish & UX
2. **Custom field types** — File attachments, images, computed fields, formula fields in register builder.
3. **Drag-and-drop reorder** — KPIs/charts/columns drag-to-reorder.
4. **Register builder improvements** — Required field validation, column reordering.

### Priority 3 — Performance & Scale
5. **Server-side filtering** — Move filter/sort from JS to SQL for datasets >5000 records.
6. **Pagination virtualization** — For 100+ records per page.
7. **CSV import streaming** — For large CSV files (>1000 rows).

### Known Limitations
- Print record uses `window.open()` which may be blocked by popup blockers
- Bulk print limited to 5 records (browser limitation)
- AI Assistant context size limited to first 3 records per register
- Mobile sidebar drawer doesn't auto-close on navigation (intentional)
- Passwords stored in plaintext for demo only; production should use bcrypt/argon2
- Session cookies are not signed; production should add HMAC signing or JWT
- Server-side permission checks implemented on ALL mutation endpoints
- Dashboard preferences don't yet support drag-and-drop reordering (only pin/hide)
- Inline edit doesn't auto-save on field blur (intentional)
- Related records search is text-based (exact match); fuzzy matching would improve results
- Export dropdown uses CSS hover (group-hover) — not accessible via keyboard
- Column visibility toggle is per-session (not persisted to DB); resets on page reload
- Quick filter pills only appear for status columns (not priority or dropdown columns)
- Recent Records widget shows audit log entries, not actual record previews

## Dev Server
- Runs on port 3000 via `bunx next dev -p 3000`
- Persistent launcher: `/home/z/my-project/start-dev.sh`
- Logs at `/home/z/my-project/dev.log`
- Current PID: 29799

## Demo Login Credentials
| Username | Password   | Role         | Department      | Visible Registers |
|----------|------------|--------------|-----------------|-------------------|
| admin    | admin123   | Super Admin  | IT              | All 30 (full access) |
| john     | john123    | Manager      | Administration   | Most (no Users/Settings) |
| ahmed    | ahmed123   | Technician   | Maintenance     | 6 Maintenance only |
| fatima   | fatima123  | HR           | Safety          | HR + Attendance + Visitors + Leave + Training |
| priya    | priya123   | Accountant   | Operations      | Vendors + Contracts + PR + Inventory + Reports |
