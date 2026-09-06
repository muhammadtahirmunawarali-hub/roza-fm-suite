# FMCore ERP — Rebuild Worklog

## Project Goal
Rebuild the attached `DD.html` (FMCore ERP — Dynamic Register & Form Builder) into a complete, professional, scalable ERP application running on Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui + Tailwind CSS 4.

## Reference Architecture (from prompt)
```
ERP
├── Dashboard (KPIs + charts, real data)
├── Modules
│   ├── Operations   (Meeting Minutes, Attendance, Toolbox Talks)
│   ├── Maintenance   (Work Orders, PM, CM, Generator Log, Chiller Log, Electrical Inspection)
│   ├── Safety        (Inspections, Risk Assessment, Permit to Work, Incidents, Accidents, Fire Equip)
│   ├── Assets        (Assets, Equipment, Buildings, Calibration)
│   ├── Procurement   (Vendors, Contracts, Material Request, Purchase Request, Inventory, SIV)
│   ├── HR            (Visitors, Leave, Training)
│   └── Performance   (Housekeeping, KPI)
├── Master Data (Registers / dynamic schema)
├── Transactions (records in registers)
├── Reports (derived from register data)
├── Administration (Users, Roles, Audit Logs)
└── Settings (theme, currency, document numbering, etc.)
```

## Core Design Decisions
1. **Preserve the "Dynamic Register & Form Builder" concept** — registers are schema-driven (columns: text, number, date, dropdown, status, priority, currency, etc.), records are JSON blobs keyed by column name. This keeps the FMCore DNA while giving us a real DB.
2. **Prisma + SQLite persistence** instead of IndexedDB (server-side, ready for SaaS migration).
3. **API-first**: every frontend action hits `/api/erp/*` routes — never direct Prisma calls from client.
4. **Audit log** records every create/update/delete with old + new values.
5. **Theme**: light/dark via class on `<html>`, persisted via Zustand.
6. **Responsive**: works on mobile, tablet, laptop, desktop. Sidebar collapses to a drawer on mobile.
7. **Sticky footer** (status bar) per UI rules.

## Tech Stack
- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York)
- Prisma 6 + SQLite
- Zustand (client state) + TanStack Query (server state — not used yet, plain fetch + state is enough)
- Recharts (charts)
- z-ai-web-dev-sdk (AI Assistant, backend only)
- Lucide icons + Font Awesome 6.5 (CDN) for register icons

## Current Status (PHASE 1 — COMPLETE ✅)

### What's Done
- **Database**: Prisma schema with Register, Record, AuditLog, Setting, Notification, OpenTab models. Auto-seeds 30 registers + 89 sample records on first load.
- **Backend**: 13 API routes under `/api/erp/*`:
  - `registers` (GET list, POST create)
  - `registers/[id]` (GET, PUT, DELETE — soft-delete)
  - `registers/[id]/records` (GET paginated/filtered/sorted/searched, POST create)
  - `registers/[id]/records/[recordId]` (GET, PUT, DELETE)
  - `dashboard` (computed KPIs + 6 charts)
  - `audit-logs` (paginated)
  - `settings` (GET, POST, PUT bulk)
  - `notifications` (GET, markRead, markAllRead)
  - `ai` (z-ai-web-dev-sdk chat with ERP context)
  - `search` (global record search)
  - `master-data` (derived dropdowns: employees, departments, buildings, etc.)
  - `backup` (export/import JSON)
  - `seed` / `reset` (manual re-seed)
- **Frontend**: Full ERP shell with:
  - Collapsible sidebar with all 30 registers grouped into 7 categories
  - Toolbar with global search (Ctrl+K command palette), theme toggle, AI, notifications
  - Tab bar (multi-tab navigation, dashboard non-closable)
  - Status bar (sticky footer with live clock + version)
  - **Dashboard**: 14 real KPIs + 6 charts (bar, doughnut, pie) + recent activity + upcoming items
  - **Register view**: sortable headers, column filters (status/priority/dropdown), debounced search, pagination (10/25/50/100), CSV export, view/edit/delete record actions
  - **Record form**: dynamic fields per column type (date pickers, dropdowns, multi-select chips, star ratings, currency inputs, master-data lookups), validation
  - **Register builder**: full form builder with 21 column types, color picker, icon picker, drag reorder columns
  - **AI Assistant**: slide-in panel with ERP context, suggested prompts, action parsing (open_register / create_register)
  - **Notifications panel**: slide-in with severity-coded icons, mark read / mark all
  - **Command palette** (Ctrl+K): navigation + actions + global record search
  - **Reports view**: dynamic summary / group-by / pivot reports from any register
  - **Audit logs view**: paginated, filterable, with detail modal showing old/new value JSON
  - **Settings**: Company profile, Appearance (theme + date format), Document numbering, Backup/Reset (export/import JSON, reset & re-seed), About

### Verified via agent-browser
- ✅ Page loads (HTTP 200, ~39KB)
- ✅ Dashboard renders all KPIs and charts from live data (89→90 records)
- ✅ Sidebar lists all 30 registers in 7 categories
- ✅ Click register → records table loads with proper badges, currency, dates, percentages, doc numbers
- ✅ Add Record modal opens, all field types work, form submits → record created, toast confirms, table refreshes
- ✅ AI Assistant chat works end-to-end (returns context-aware answers using real data)
- ✅ Audit Logs view shows create/update/delete events with detail modal
- ✅ Reports view loads with register selector + report type + run + export
- ✅ Settings view shows all sections, theme switch works
- ✅ Mobile viewport (375x812): sidebar collapses to drawer, layout reflows, no horizontal overflow
- ✅ Lint clean (0 errors)
- ✅ No console errors after the formatTimeAgo fix

## Current Goals / Completed Modifications
- [DONE] Architecture + design system
- [DONE] Prisma schema + seed (30 registers, 89 records)
- [DONE] All API routes (CRUD + dashboard + AI + search + backup)
- [DONE] Full ERP shell with all 7 modules
- [DONE] QA via agent-browser confirms interactive functionality

## Unresolved Issues / Risks / Next-Phase Priorities
1. **Record form UX**: when filling a new record, the user must use shadcn Select dropdowns for status/priority/employee fields — these open as popovers which need careful keyboard handling on mobile.
2. **CSV import**: not implemented yet (only CSV export is). Next phase: add CSV import workflow (preview → map columns → validate → import).
3. **Print layouts**: not implemented (Quotation, Invoice, Work Order, etc.). Next phase: add print-friendly templates.
4. **Multi-user / RBAC**: User model exists in schema but no login screen. Auth is simulated (always "Admin"). Next phase: NextAuth.js login + role-based UI restrictions.
5. **Approval workflows**: not implemented (Purchase Request → Approved, Expense → Submitted → Approved → Paid). Next phase: add status machine + approval UI.
6. **Real-time notifications**: currently poll-based when panel opens. Next phase: WebSocket mini-service for push notifications.
7. **Performance**: register filter/sort happens in JS after fetching all records. For very large datasets (>5000 records), this should move to SQL with proper indexing.

## Files Created (key ones)
```
prisma/schema.prisma                          (Register, Record, AuditLog, Setting, Notification, OpenTab)
src/lib/erp/types.ts                          (ColumnType, ColumnDef, Register, RecordData, etc.)
src/lib/erp/sample-data.ts                    (30 registers + 89 records extracted from DD.html)
src/lib/erp/api.ts                            (typed API client)
src/lib/erp/store.ts                          (Zustand: tabs, theme, panels, builder)
src/lib/erp/utils.ts                          (formatCurrency, formatDate, statusVariant, validateRecord, etc.)
src/lib/erp/seed.ts                           (seedDatabase, resetDatabase, getStats)
src/app/api/erp/registers/route.ts
src/app/api/erp/registers/[id]/route.ts
src/app/api/erp/registers/[id]/records/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/route.ts
src/app/api/erp/dashboard/route.ts
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
src/components/erp/erp-shell.tsx
src/components/erp/sidebar.tsx
src/components/erp/toolbar.tsx
src/components/erp/tab-bar.tsx
src/components/erp/status-bar.tsx
src/components/erp/dashboard.tsx
src/components/erp/register-view.tsx
src/components/erp/record-form.tsx
src/components/erp/register-builder.tsx
src/components/erp/ai-assistant.tsx
src/components/erp/notifications-panel.tsx
src/components/erp/command-palette.tsx
src/components/erp/reports-view.tsx
src/components/erp/audit-logs-view.tsx
src/components/erp/settings-view.tsx
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
