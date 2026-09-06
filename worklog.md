# FMCore ERP — Rebuild Worklog

## Project Goal
Rebuild the attached `DD.html` (FMCore ERP — Dynamic Register & Form Builder) into a complete, professional, scalable ERP application running on Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui + Tailwind CSS 4.

## Reference Architecture (from prompt)
```
ERP
├── Dashboard (KPIs + charts, real data, clickable)
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
1. **Preserve the "Dynamic Register & Form Builder" concept** — registers are schema-driven (columns: text, number, date, dropdown, status, priority, currency, etc.), records are JSON blobs keyed by column name.
2. **Prisma + SQLite persistence** (server-side, ready for SaaS migration).
3. **API-first**: every frontend action hits `/api/erp/*` routes — never direct Prisma calls from client.
4. **Audit log** records every create/update/delete with old + new values.
5. **Theme**: light/dark via class on `<html>`, persisted via Zustand.
6. **Responsive**: works on mobile, tablet, laptop, desktop. Sidebar collapses to a drawer on mobile.
7. **Sticky footer** (status bar) per UI rules.

## Tech Stack
- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York)
- Prisma 6 + SQLite
- Zustand (client state)
- Recharts (charts)
- z-ai-web-dev-sdk (AI Assistant, backend only)
- Lucide icons + Font Awesome 6.5 (CDN) for register icons

---

## Round 2 — Status (2026-09-06)

### QA Findings (issues identified via agent-browser)
1. **CRITICAL: Audit Log detail modal had no Escape key handler** — it would get stuck after pressing Escape and block sidebar navigation.
2. **Record form UX issues** — flat 2-column grid without section grouping; percentage/currency fields indistinguishable in a11y tree; required field indicators missing.
3. **No CSV Import** — only CSV export existed (prompt requires both).
4. **No Print layouts** — prompt requires print-friendly layouts for records.
5. **No Bulk actions** — multi-row selection + bulk delete/export missing.
6. **Dashboard KPIs not clickable** — KPI cards displayed values but couldn't deep-link to filtered register views.
7. **Status badges had no icons** — plain text badges.
8. **No quick actions** — dashboard lacked a quick-action launcher.

### What Was Done This Round

#### 🐛 Bug Fixes
- **Audit Log modal** (`audit-logs-view.tsx`): Rewrote to use shadcn `Dialog` component which handles Escape natively. Added action filter dropdown, stats strip ("Created X, Updated Y, Deleted Z"), CSV export of filtered logs, action badges with icons (fa-plus, fa-pen, fa-trash, etc.), user avatar with initial, skeleton loading, better empty state.

#### ✨ New Features
1. **CSV Import workflow** (`csv-import.tsx`, 388 lines) — Full 4-step wizard:
   - Step 1: Drag-and-drop file upload zone + template download
   - Step 2: Auto-mapping of CSV columns to register columns (with manual override via dropdowns) + 5-row preview table
   - Step 3: Validating spinner
   - Step 4: Result summary (imported count, failed count, error details per row)
   - Tips section with format guidance (dates as YYYY-MM-DD, multi-select as semicolon-separated, etc.)
   - New backend route: `POST /api/erp/registers/[id]/records/bulk` for atomic bulk creation

2. **Print Record** (`print-record.tsx`, 200 lines) — Opens a print-friendly window for any record with:
   - Company header (logo, name, address, contact, tax number)
   - Document number + type + issue date
   - Two-column field layout (long_text fields span full width)
   - Audit info (Record ID, Created, Last Updated)
   - Signature areas (Prepared By, Authorized Signature)
   - Auto-triggers `window.print()` on load
   - Works from row action menu AND view modal footer

3. **Bulk Actions** (`bulk-actions.tsx`, 130 lines) — Shown when rows are selected:
   - Select-all checkbox in table header
   - Per-row checkboxes (sticky left column)
   - Action bar with: Export Selected (CSV), Print Selected (max 5), Delete (with confirmation dialog)
   - Selected count indicator
   - Clear selection button

4. **Register View enhancements** (`register-view.tsx`):
   - New "Import" button next to Export
   - Stats strip above table (Total, status breakdown, currency sum)
   - Per-row Print button (View, Edit, Print, Delete)
   - Status badges now have icons (fa-circle-check, fa-clock, fa-circle-xmark)
   - Priority badges now have icons (fa-triangle-exclamation, fa-arrow-up, fa-equals, fa-arrow-down)
   - Percentage cells now show a mini progress bar
   - Selected rows highlighted with accent color
   - Better empty state (with Import CSV option)

5. **Record Form improvements** (`record-form.tsx`):
   - Sections grouping (Identification, Details, Classification, Status, Timeline, Assignment, Location, Contact, Financials, Metrics)
   - Each section has icon + field count
   - Progress bar at top showing fill % (red if errors, accent if clean)
   - Field labels include type-specific icons
   - Currency inputs show "AED" prefix inside input
   - Percentage inputs show "%" suffix inside input
   - Better error messages with AlertCircle icon
   - Required field indicator (*) preserved
   - Error count in footer

6. **Dashboard improvements** (`dashboard.tsx`):
   - KPI cards are now clickable buttons that deep-link to filtered register views
   - Hover effect: card lifts (-translate-y-0.5) + shadow + accent border
   - "Open →" hint appears on hover
   - New Quick Actions panel (6 quick-launch buttons: New Work Order, New Purchase Request, Report Incident, Issue Permit, Add Vendor, Log Visitor)
   - Recent Activity panel has "View all →" link to Audit Logs tab
   - Chart animations (600ms duration)
   - Better tooltips with cursor fill

#### 🎨 Styling Polish
- Register header icon now uses gradient background instead of flat color
- Category badge uses register color
- Audit log action badges have icons + colored backgrounds
- User avatars in audit log show first initial
- Form field labels include type icons
- Multi-select chips show ✓ when selected
- Rating buttons scale on hover
- All animations respect `prefers-reduced-motion`

### Verification Results (agent-browser)
- ✅ Dev server stable (PID 4291, HTTP 200, ~40KB responses)
- ✅ Lint clean (0 errors, 0 warnings)
- ✅ No runtime errors in dev log
- ✅ Dashboard renders all 14 KPIs + 6 charts + Quick Actions panel
- ✅ Clicking KPI "OPEN WORK ORDERS" navigates to Maintenance Work Orders register
- ✅ Audit Log modal opens on row click, Escape properly closes it (was the critical bug)
- ✅ Audit Log action filter dropdown works
- ✅ Audit Log stats strip shows correct counts
- ✅ CSV Import: uploaded test-vendors.csv (3 rows) → auto-mapped 7/7 columns → preview showed data → imported 3 records (0 failures) → Vendor Register went from 3 → 6 records
- ✅ Bulk actions: selected 2 rows → bar appeared with Export/Print/Delete/Clear → Clear worked
- ✅ Record form: shows 5 sections (Details, Classification, Status, Contact, Metrics) with field counts + progress bar
- ✅ View modal has Print + Edit Record buttons in footer
- ✅ Mobile viewport (375×812): responsive, no errors, no horizontal overflow
- ✅ AI Assistant still works end-to-end

### Files Modified/Created This Round
```
NEW: src/components/erp/csv-import.tsx            (388 lines — CSV import wizard)
NEW: src/components/erp/bulk-actions.tsx          (130 lines — bulk action bar)
NEW: src/components/erp/print-record.tsx         (200 lines — print layout generator)
NEW: src/app/api/erp/registers/[id]/records/bulk/route.ts  (bulk import API)
MODIFIED: src/components/erp/audit-logs-view.tsx  (rewrote with shadcn Dialog + filters + stats)
MODIFIED: src/components/erp/register-view.tsx   (added Import/Print/Bulk actions + stats strip + status icons)
MODIFIED: src/components/erp/record-form.tsx      (added section grouping + progress bar + field icons)
MODIFIED: src/components/erp/dashboard.tsx        (clickable KPIs + Quick Actions panel + chart animations)
MODIFIED: src/lib/erp/api.ts                      (added bulkCreate method)
```

## Current Goals / Completed Modifications
- [DONE] Architecture + design system (Round 1)
- [DONE] Prisma schema + seed (30 registers, 89 records) (Round 1)
- [DONE] All API routes (CRUD + dashboard + AI + search + backup) (Round 1)
- [DONE] Full ERP shell with all 7 modules (Round 1)
- [DONE] **Fix Audit Log modal Escape handling** (Round 2)
- [DONE] **CSV Import workflow** (Round 2)
- [DONE] **Print Record feature** (Round 2)
- [DONE] **Bulk Actions** (Round 2)
- [DONE] **Record form sections + progress bar** (Round 2)
- [DONE] **Clickable KPIs + Quick Actions** (Round 2)
- [DONE] **Styling polish: icons in badges, gradient headers, animations** (Round 2)

## Unresolved Issues / Risks / Next-Phase Priorities

### Priority 1 — High-Value Features Still Missing
1. **Multi-user / RBAC + Login screen** — User model exists in Prisma schema but no login UI. Auth is simulated (always "Admin"). Next phase: NextAuth.js login + role-based UI restrictions per module.
2. **Approval workflows** — Purchase Request → Approved, Expense → Submitted → Approved → Paid. Status machine + approval UI with role-based approvers.
3. **Real-time notifications** — Currently poll-based when panel opens. Next phase: WebSocket mini-service (port 3003) for push notifications.

### Priority 2 — Polish & UX
4. **Saved views / filters** — Let users save filter combinations for quick access (e.g. "Critical Open WOs").
5. **Record detail drawer** — Slide-in drawer with full record details + inline edit, instead of modal.
6. **KPI sparklines** — Mini sparkline charts inside KPI cards showing 7-day trend.
7. **Empty state illustrations** — SVG illustrations instead of plain icons.

### Priority 3 — Performance & Scale
8. **Server-side filtering** — Currently register filter/sort happens in JS after fetching all records. Move to SQL with proper indexing for datasets >5000 records.
9. **Pagination virtualization** — For 100+ records per page, use windowing.
10. **CSV import streaming** — For large CSV files (>1000 rows), stream parsing instead of loading all into memory.

### Known Limitations
- Print record uses `window.open()` which may be blocked by popup blockers (user must allow popups for the domain)
- Bulk print limited to 5 records (browser limitation on multiple print windows)
- AI Assistant context size limited to first 3 records per register (to fit in token budget)
- Mobile sidebar drawer doesn't auto-close on navigation (intentional — user may want to switch registers quickly)

## Files Created (cumulative across all rounds)
```
prisma/schema.prisma                          (Register, Record, AuditLog, Setting, Notification, OpenTab, User)
src/lib/erp/types.ts                          (ColumnType, ColumnDef, Register, RecordData, etc.)
src/lib/erp/sample-data.ts                    (30 registers + 89 records extracted from DD.html)
src/lib/erp/api.ts                            (typed API client + bulkCreate)
src/lib/erp/store.ts                          (Zustand: tabs, theme, panels, builder)
src/lib/erp/utils.ts                          (formatCurrency, formatDate, statusVariant, validateRecord, etc.)
src/lib/erp/seed.ts                           (seedDatabase, resetDatabase, getStats)
src/app/api/erp/registers/route.ts
src/app/api/erp/registers/[id]/route.ts
src/app/api/erp/registers/[id]/records/route.ts
src/app/api/erp/registers/[id]/records/[recordId]/route.ts
src/app/api/erp/registers/[id]/records/bulk/route.ts   ← NEW (bulk import)
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
src/components/erp/dashboard.tsx              (upgraded: clickable KPIs + Quick Actions)
src/components/erp/register-view.tsx          (upgraded: Import/Print/Bulk + stats strip)
src/components/erp/record-form.tsx           (upgraded: section grouping + progress bar)
src/components/erp/register-builder.tsx
src/components/erp/ai-assistant.tsx
src/components/erp/notifications-panel.tsx
src/components/erp/command-palette.tsx
src/components/erp/reports-view.tsx
src/components/erp/audit-logs-view.tsx        (upgraded: shadcn Dialog + filters + stats)
src/components/erp/settings-view.tsx
src/components/erp/csv-import.tsx             ← NEW
src/components/erp/bulk-actions.tsx           ← NEW
src/components/erp/print-record.tsx          ← NEW
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
- Current PID: 4291 (stable across this round)
