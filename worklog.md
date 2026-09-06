# FMCore ERP — Rebuild Worklog

## Project Goal
Rebuild the attached `DD.html` (FMCore ERP — Dynamic Register & Form Builder) into a complete, professional, scalable ERP application running on Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui + Tailwind CSS 4.

---

## Round 13 — Status (2026-09-06)

### QA Findings
- ✅ Verified all Round 12 features (Column Editor, Tab Navigator, Currency Integration)
- ✅ Login flow works (admin → dashboard)
- ✅ Settings → Currency shows "QAR" with "Symbol: QAR" — global currency propagating correctly
- ✅ No console errors after fix

### Bug Fixed This Round
- **Runtime error**: `currency is not defined` in `CellContent` function (register-view.tsx:826) — the `CellContent` component was using `currency` variable from the parent scope but it wasn't passed as a prop. Fixed by adding `currency` parameter to `CellContent` function signature and passing it from the parent.

### Work Focus This Round
This round delivered 3 improvements:

1. **Custom Currency Support** — Users can now type their own currency code (e.g., BHD, KWD, OMR)
2. **Extended Currency Symbol Map** — 26+ currencies with proper symbols
3. **Currency Propagation Fix** — Global currency from Settings now correctly flows to dashboard KPIs, register stats, and cell rendering

### What Was Done This Round

#### ✨ Improvements

1. **Custom Currency Support** (`settings-view.tsx`):
   - Currency dropdown now includes "Custom" option at the bottom
   - When "Custom" is selected, a text input appears next to the dropdown
   - User can type any 3-5 letter currency code (e.g., BHD, KWD, OMR, MYR, THB)
   - Custom currency code is saved as `company.currency_custom` setting
   - Symbol display shows the custom code as the symbol (since it's not in the standard map)
   - Available preset currencies expanded from 7 to 14: AED, USD, EUR, GBP, PKR, SAR, QAR, INR, JPY, CNY, CHF, CAD, AUD, + Custom

2. **Extended Currency Symbol Map** (`utils.ts`):
   - Added 26+ currency symbols: AED (د.إ), USD ($), EUR (€), GBP (£), PKR (₨), SAR (﷼), QAR (﷼), INR (₹), JPY (¥), CNY (¥), KRW (₩), CHF, CAD (C$), AUD (A$), NZD, SGD, HKD, THB (฿), TRY (₺), RUB (₽), BRL (R$), ZAR (R), MXN ($), EGP (E£), NGN (₦), KES (KSh), GHS (₵)
   - New `getCurrencySymbol()` function — falls back to the currency code itself for unknown currencies (e.g., "BHD" → "BHD")
   - `formatCurrency()` and `formatCurrencyCompact()` now use the extended map

3. **Currency Propagation Fix** (`register-view.tsx` + `dashboard/route.ts`):
   - **Root cause**: `CellContent` component was referencing `currency` variable from parent scope but it wasn't passed as a parameter
   - **Fix**: Added `currency` parameter to `CellContent` function signature (default: 'AED'), passed from parent via `currency={currency}` prop
   - **Dashboard API**: Now reads currency from DB settings (`company.currency` + `company.currency_custom`) and passes it to `formatAED()` function (renamed to accept currency param)
   - **ErpShell**: Now handles custom currency — if `company.currency === 'Custom'`, reads `company.currency_custom` and sets that as the global currency
   - **Verified**: Purchase Request register shows "QAR 46.2K" in stats strip (was hardcoded "AED" before)

### Verification Results (agent-browser)
- ✅ Settings → Currency dropdown shows 14 options + "Custom"
- ✅ Settings shows "Currency: QAR, Symbol: QAR"
- ✅ Purchase Request register shows "Estimated Cost (Σ): QAR 46.2K" (was "AED" before)
- ✅ "Edit" column button visible in register view
- ✅ Lint: 0 errors, 0 warnings
- ✅ Dev server stable (PID 1077)
- ✅ No runtime errors after CellContent currency prop fix

### Files Modified This Round
```
MODIFIED: src/lib/erp/utils.ts                    (extended currency symbol map + getCurrencySymbol function)
MODIFIED: src/components/erp/settings-view.tsx    (custom currency input + 14 preset currencies + Custom option)
MODIFIED: src/components/erp/erp-shell.tsx         (loads custom currency from settings)
MODIFIED: src/app/api/erp/dashboard/route.ts      (reads currency from settings, passes to formatAED)
MODIFIED: src/components/erp/register-view.tsx     (fixed CellContent currency prop + uses global currency in stats)
```

---

## Suggestions for Before/After Image Management & Work Reports

### 1. Before/After Images for Assets and Work Orders

**Current State**: No image support in the register system. All fields are text/number/date/dropdown types.

**Recommended Approach**:

#### Option A: Image URL Fields (Simple — can do now)
- Add a new column type `image_url` to the register builder
- Users paste a URL to an externally hosted image (e.g., company SharePoint, Google Drive link)
- Display as a thumbnail in the table + full image in the record detail drawer
- **Pros**: No server storage needed, works immediately
- **Cons**: Requires external hosting, URLs can break

#### Option B: File Upload to Cloud Storage (Recommended for production)
- Add a new column type `file_attachment` to the register builder
- Create an upload API endpoint that accepts multipart/form-data
- Store files in **Cloudflare R2** or **AWS S3** (SaaS-ready)
- Save only the file path/URL in the record data (not the binary)
- Display thumbnails for images, download links for documents
- **Pros**: Secure, scalable, files persist with the record
- **Cons**: Requires cloud storage account + API integration

#### Option C: Base64 in Record Data (Not recommended for production)
- Store images as base64 strings directly in the record's JSON data
- **Pros**: No external storage needed
- **Cons**: Bloats the database, slow queries, not scalable

#### Recommended Implementation for FMCore ERP:
```
Phase 1 (Now): Add 'image_url' column type → display thumbnails in table + drawer
Phase 2 (SaaS): Add 'file_attachment' column type → upload to Cloudflare R2
Phase 3 (Mobile): Camera capture API → take photos directly from mobile browser
```

### 2. Work Reports

**Current State**: The Reports view supports Summary, Group-by, and Pivot reports on any register. Reports are generated dynamically from live data and can be exported as CSV.

**Recommended Enhancements**:

#### A. Saved Report Templates
- Let users save report configurations (register, type, group-by field, filters) as templates
- Templates can be shared across users (like Saved Views)
- One-click report generation from saved templates

#### B. Scheduled Reports (Email Delivery)
- Schedule reports to run daily/weekly/monthly
- Email the report as PDF/CSV attachment to specified recipients
- Requires: SMTP integration + cron job service

#### C. Visual Report Builder
- Drag-and-drop report builder: select register → select fields → select chart type → save
- Generate bar/line/pie/table charts from any register data
- More powerful than the current Summary/Group-by/Pivot approach

#### D. Work Order Completion Report
- Special report for maintenance work orders:
  - Show: WO #, Date, Asset, Technician, Hours spent, Parts used, Before/After images, Completion notes
  - Generate as PDF with company letterhead
  - Can be attached to the work order record

#### E. KPI Dashboard Reports
- Monthly/Quarterly KPI summary report:
  - PM completion rate, Work order turnaround time, Incident count, Inventory value
  - Compare to previous period (trend analysis)
  - Export as PDF with charts embedded

### 3. Suggested New Columns to Add to Existing Registers

To make the registers richer with more data points:

#### Work Orders — Add:
- `Reported By` (employee) — who reported the issue
- `Reported Date` (datetime) — when it was reported
- `Started Date` (datetime) — when work actually started
- `Completed Date` (datetime) — when work was completed
- `Labor Hours` (number) — total hours spent
- `Parts Used` (long_text) — list of parts consumed
- `Before Image` (image_url) — photo before repair
- `After Image` (image_url) — photo after repair
- `Category` (dropdown) — [Mechanical, Electrical, Plumbing, HVAC, Civil, General]
- `Sub-Category` (dropdown) — [Preventive, Corrective, Emergency, Inspection]
- `Warranty Claim` (dropdown) — [Yes, No, N/A]
- `Vendor Cost` (currency) — cost charged by external vendor

#### Safety Inspections — Add:
- `Inspection Type` (dropdown) — [Routine, Surprise, Scheduled, Follow-up, Annual, Monthly]
- `Findings Count` (number) — number of issues found
- `Corrective Actions` (long_text) — what needs to be done
- `Follow-up Required` (dropdown) — [Yes, No]
- `Follow-up Date` (date) — deadline for corrective action
- `Photos` (image_url) — inspection evidence

#### Assets — Add:
- `Acquisition Date` (date) — when purchased
- `Useful Life (years)` (number) — expected lifespan
- `Depreciation Method` (dropdown) — [Straight Line, Declining Balance, None]
- `Current Book Value` (currency) — calculated value after depreciation
- `Last Inspection Date` (date)
- `Next Inspection Date` (date)
- `Image` (image_url) — photo of the asset
- `QR Code` (text) — QR code identifier for scanning

#### Purchase Requests — Add:
- `Justification` (long_text) — why this purchase is needed
- `Quote Attached` (dropdown) — [Yes, No]
- `Vendor Quotes` (number) — number of quotes obtained
- `Preferred Vendor` (vendor) — recommended supplier
- `Delivery Required By` (date) — deadline
- `Project Code` (text) — for cost allocation

### 4. How to Implement These Columns Now

The **Column Editor** (added in Round 12) lets SuperAdmin add these columns to any existing register:
1. Open the register (e.g., Work Orders)
2. Click "Edit" button in the action bar
3. Click "Add Column"
4. Enter name (e.g., "Reported By"), select type (e.g., "employee"), set width
5. Click "Save Columns"
6. The new column appears in the table and the record form

The register builder also supports these for new registers.

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
- [DONE] **Custom Currency Support + Extended Symbol Map** (R13)
- [DONE] **Currency Propagation Fix (CellContent)** (R13)

## Dev Server
- Runs on port 3000 via `bunx next dev -p 3000`
- Persistent launcher: `/home/z/my-project/start-dev.sh`
- Logs at `/home/z/my-project/dev.log`
- Current PID: 1077

## Demo Login Credentials
| Username | Password   | Role         | Department      | Visible Registers |
|----------|------------|--------------|-----------------|-------------------|
| admin    | admin123   | Super Admin  | IT              | All 30 (full access) |
| john     | john123    | Manager      | Administration   | Most (no Users/Settings) |
| ahmed    | ahmed123   | Technician   | Maintenance     | 6 Maintenance only |
| fatima   | fatima123  | HR           | Safety          | HR + Attendance + Visitors + Leave + Training |
| priya    | priya123   | Accountant   | Operations      | Vendors + Contracts + PR + Inventory + Reports |
