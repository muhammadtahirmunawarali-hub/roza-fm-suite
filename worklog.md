# FMCore ERP — Rebuild Worklog

## Project Goal
Rebuild the attached `DD.html` (FMCore ERP — Dynamic Register & Form Builder) into a complete, professional, scalable ERP application running on Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui + Tailwind CSS 4.

---

## Round 15 — Status (2026-09-06)

### QA Findings
- ✅ All Round 14 features verified (Stock Movements, Drag-and-Drop Columns, RTL)
- ✅ Login flow works
- ✅ No console errors

### Bug Fixed This Round
- **CRITICAL: Application error when clicking "Add Record" or "Inline Edit"** — `currency is not defined` ReferenceError in `FieldRenderer` and `InlineField` components. These are separate function components that were referencing the `currency` variable from their parent component's scope without it being passed as a prop.

### Work Focus This Round
This round fixed the currency propagation issue across ALL components:

1. **RecordForm** (`record-form.tsx`):
   - `FieldRenderer` function now accepts `currency` parameter (default: 'AED')
   - `currency` prop passed from `RecordForm` to `FieldRenderer` via `<FieldRenderer currency={currency} />`
   - The currency prefix span now uses `{currency}` instead of hardcoded `"AED"`

2. **Record Detail Drawer** (`record-detail-drawer.tsx`):
   - `RecordDetailDrawer` now destructures `currency` from `useErpStore()`
   - `DetailsTab` accepts `currency` prop, passes to `FieldCard`
   - `FieldCard` accepts `currency` prop, uses it in `formatCurrencyCompact(n, currency)`
   - `InlineEditTab` accepts `currency` prop, passes to `InlineField`
   - `InlineField` accepts `currency` prop, uses it in the currency prefix span
   - `formatCurrencyCompact` function updated to accept `currency` parameter (default: 'AED')

3. **Dashboard** (`dashboard.tsx`):
   - Now destructures `currency` from `useErpStore()`
   - Chart subtitle uses `{currency}` instead of hardcoded `"AED"`: `Capital distribution (USD)`
   - Chart tooltip uses `{currency}` instead of `"AED"`

### Verification Results (agent-browser)
- ✅ Settings shows "Currency: PKR" (user changed to PKR in prior session)
- ✅ Register stats show "PKR 46.2K" (was AED before)
- ✅ **Add Record modal opens without error** — was crashing before with "currency is not defined"
- ✅ Currency prefix in form shows "PKR" (was hardcoded "AED")
- ✅ **View (drawer) opens** — shows record details
- ✅ **Inline Edit works** — no more application error
- ✅ Edit mode shows "PKR" prefix on currency fields (was "AED")
- ✅ Lint: 0 errors, 0 warnings
- ✅ Dev server stable (PID 7139)

### Files Modified This Round
```
MODIFIED: src/components/erp/record-form.tsx           (FieldRenderer accepts currency prop + passed from parent)
MODIFIED: src/components/erp/record-detail-drawer.tsx   (FieldCard, InlineField, DetailsTab, InlineEditTab all accept currency + formatCurrencyCompact uses currency)
MODIFIED: src/components/erp/dashboard.tsx              (chart subtitle + tooltip use global currency instead of hardcoded AED)
```

---

## Current Goals / Completed Modifications (All Rounds)
- [DONE] Architecture + design system (R1)
- [DONE] Prisma schema + seed (R1)
- [DONE] All API routes (R1)
- [DONE] Full ERP shell (R1)
- [DONE] Audit Log modal fix (R2)
- [DONE] CSV Import (R2)
- [DONE] Print Record (R2)
- [DONE] Bulk Actions (R2)
- [DONE] Record form sections (R2)
- [DONE] Clickable KPIs + Quick Actions (R2)
- [DONE] Login screen + session auth (R3)
- [DONE] RBAC: 11 roles (R3)
- [DONE] User Management CRUD (R3)
- [DONE] User Menu dropdown (R3)
- [DONE] Permission Enforcement in UI (R4)
- [DONE] Approval Workflow UI (R4)
- [DONE] Saved Views UI (R4)
- [DONE] KPI Sparklines + Activity Timeline (R4)
- [DONE] Record Detail Drawer (R5)
- [DONE] Workflow History timeline (R5)
- [DONE] Server-side permission checks (R5)
- [DONE] Empty state SVG illustrations (R5)
- [DONE] Inline Edit in Drawer (R6)
- [DONE] Custom Dashboard Widgets (R6)
- [DONE] Saved Views Management (R7)
- [DONE] Server-side checks on records CRUD (R7)
- [DONE] Workflow History CSV export (R7)
- [DONE] Server-side checks on users CRUD (R8)
- [DONE] Saved View editing (R8)
- [DONE] Related Records panel (R9)
- [DONE] System Statistics widget (R9)
- [DONE] JSON Export (R10)
- [DONE] Keyboard Shortcuts modal (R10)
- [DONE] System Overview Widget (R10)
- [DONE] Column Visibility Toggle (R11)
- [DONE] Quick Status Filter Pills (R11)
- [DONE] Notification Auto-Refresh (R11)
- [DONE] Recent Records Widget (R11)
- [DONE] Column Editor for existing registers (R12)
- [DONE] Tab Navigator dropdown (R12)
- [DONE] Global Currency Integration (R12)
- [DONE] Custom Currency Support (R13)
- [DONE] Currency Propagation Fix for CellContent (R13)
- [DONE] Stock Movement API (R14)
- [DONE] Drag-and-Drop Column Reordering (R14)
- [DONE] RTL Layout Support (R14)
- [DONE] **Currency Propagation Fix for RecordForm FieldRenderer** (R15) — fixes the "currency is not defined" crash
- [DONE] **Currency Propagation Fix for Record Detail Drawer** (R15) — FieldCard + InlineField + DetailsTab + InlineEditTab
- [DONE] **Dashboard chart currency sync** (R15) — subtitle + tooltip use global currency

## Dev Server
- Runs on port 3000 via `bunx next dev -p 3000`
- Persistent launcher: `/home/z/my-project/start-dev.sh`
- Logs at `/home/z/my-project/dev.log`
- Current PID: 7139

## Demo Login Credentials
| Username | Password   | Role         | Department      | Visible Registers |
|----------|------------|--------------|-----------------|-------------------|
| admin    | admin123   | Super Admin  | IT              | All 30 (full access) |
| john     | john123    | Manager      | Administration   | Most (no Users/Settings) |
| ahmed    | ahmed123   | Technician   | Maintenance     | 6 Maintenance only |
| fatima   | fatima123  | HR           | Safety          | HR + Attendance + Visitors + Leave + Training |
| priya    | priya123   | Accountant   | Operations      | Vendors + Contracts + PR + Inventory + Reports |
