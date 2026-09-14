'use client';

// FMCore ERP — Print Record Layout
// Opens a print-friendly view of any record (in a new window) with company header,
// document number, all fields, and signature area.
import type { Register, RecordData } from '@/lib/erp/types';
import { formatDocNumber, formatDate, formatDateTime, displayColumnName } from '@/lib/erp/utils';
import { toast } from 'sonner';

interface PrintData {
  register: Register;
  record: RecordData;
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    tax_number?: string;
  };
}

export function printRecord(register: Register, record: RecordData, company: PrintData['company'], currency = 'AED') {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    toast.error('Popup blocked', { description: 'Please allow popups for this site to print records.' });
    return;
  }

  const docNumber = (() => {
    const autoCol = register.columns.find((c) => c.type === 'auto_increment');
    if (autoCol && record.data[autoCol.name]) {
      // Generate prefix from register code
      const prefix = register.code.slice(0, 3).toUpperCase();
      return `${prefix}-${String(record.data[autoCol.name]).padStart(4, '0')}`;
    }
    return `REC-${String(record.sequence).padStart(4, '0')}`;
  })();

  const printableCols = register.columns.filter((c) => c.type !== 'auto_increment');
  const half = Math.ceil(printableCols.length / 2);
  const leftCols = printableCols.slice(0, half);
  const rightCols = printableCols.slice(half);

  const formatVal = (val: any, type: string): string => {
    if (val === undefined || val === null || val === '') return '—';
    if (type === 'date') return formatDate(String(val));
    if (type === 'datetime') return formatDateTime(String(val));
    if (type === 'currency') return `${currency} ${Number(val).toLocaleString()}`;
    if (type === 'percentage') return `${val}%`;
    if (type === 'multi_select') return Array.isArray(val) ? val.join(', ') : String(val);
    if (type === 'rating') return `${'★'.repeat(Number(val) || 0)}${'☆'.repeat(5 - (Number(val) || 0))}`;
    if (type === 'url') return String(val);
    if (type === 'color') return String(val);
    if (type === 'tags') return Array.isArray(val) ? val.map((v: string) => `#${v}`).join(' ') : String(val);
    if (type === 'image') return ''; // rendered separately below
    return String(val);
  };

  // Render image cells as actual <img> tags (not in the formatVal function)
  const renderField = (c: any, statusColorFn?: (s: string) => string): string => {
    const val = record.data[c.name];
    const label = displayColumnName(c.name, currency);
    if (c.type === 'image' && val) {
      return `<div class="field"><div class="field-label">${label}</div><img src="${val}" alt="${label}" style="max-width:200px;max-height:200px;border:1px solid #e2e8f0;border-radius:4px;" /></div>`;
    }
    if (c.type === 'status' && val && statusColorFn) {
      const color = statusColorFn(String(val));
      return `<div class="field"><div class="field-label">${label}</div><div class="field-value status-text" style="background:${color}22;color:${color};">${escapeHtml(formatVal(val, c.type))}</div></div>`;
    }
    if (c.type === 'priority' && val && statusColorFn) {
      const pv = String(val).toLowerCase();
      const color = pv === 'critical' ? '#EF4444' : pv === 'high' ? '#F59E0B' : pv === 'medium' ? '#3B82F6' : '#10B981';
      return `<div class="field"><div class="field-label">${label}</div><div class="field-value priority-text" style="background:${color}22;color:${color};">${escapeHtml(formatVal(val, c.type))}</div></div>`;
    }
    return `<div class="field ${c.type === 'long_text' ? 'long-text-field' : ''}"><div class="field-label">${label}</div><div class="field-value">${escapeHtml(formatVal(val, c.type))}</div></div>`;
  };

  // Status badge color
  const statusColor = (s: string): string => {
    const ss = (s || '').toLowerCase();
    if (['open', 'draft', 'pending', 'due', 'scheduled'].includes(ss)) return '#F59E0B';
    if (['in progress', 'active', 'approved', 'issued', 'completed'].includes(ss)) return '#10B981';
    if (['overdue', 'critical', 'rejected', 'cancelled'].includes(ss)) return '#EF4444';
    if (['closed', 'inactive', 'standby'].includes(ss)) return '#64748B';
    return '#64748B';
  };

  // Find status and priority for header badge
  const statusCol = printableCols.find((c) => c.type === 'status');
  const priorityCol = printableCols.find((c) => c.type === 'priority');
  const statusVal = statusCol ? String(record.data[statusCol.name] || '') : '';
  const priorityVal = priorityCol ? String(record.data[priorityCol.name] || '') : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${register.name} — ${docNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #1a202c;
    font-size: 11px;
    line-height: 1.5;
    padding: 25px;
    background: #fff;
  }
  /* Header with gradient accent */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 3px solid ${register.color};
    position: relative;
  }
  .header::before {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    width: 60%;
    height: 3px;
    background: linear-gradient(90deg, ${register.color}, ${register.color}44);
  }
  .company { flex: 1; }
  .company-logo {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, ${register.color}, ${register.color}cc);
    color: white;
    font-size: 22px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    margin-bottom: 8px;
    box-shadow: 0 2px 8px ${register.color}33;
  }
  .company-name { font-size: 16px; font-weight: 700; color: #1a202c; margin-bottom: 3px; }
  .company-meta { font-size: 10px; color: #64748b; line-height: 1.5; }
  .doc-info { text-align: right; }
  .doc-type {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: ${register.color};
    font-weight: 700;
    margin-bottom: 4px;
  }
  .doc-number { font-size: 20px; font-weight: 800; color: #1a202c; margin-bottom: 6px; letter-spacing: -0.5px; }
  .doc-date { font-size: 10px; color: #64748b; }
  /* Status/Priority badges */
  .badges { display: flex; gap: 8px; margin-bottom: 16px; }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 600;
    color: white;
  }
  .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: white; }
  /* Section titles */
  .section-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748b;
    font-weight: 700;
    margin: 14px 0 8px;
    padding-bottom: 3px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .section-title::before {
    content: '';
    width: 3px;
    height: 12px;
    background: ${register.color};
    border-radius: 2px;
  }
  /* Fields grid */
  .fields-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 24px;
    margin-bottom: 12px;
  }
  .field { padding: 4px 0; }
  .field-label {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94a3b8;
    margin-bottom: 1px;
    font-weight: 600;
  }
  .field-value {
    font-size: 12px;
    color: #1a202c;
    font-weight: 500;
    word-wrap: break-word;
  }
  .long-text-field {
    grid-column: 1 / -1;
    padding: 8px 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 11px;
    color: #334155;
    line-height: 1.5;
    white-space: pre-wrap;
  }
  .field-value.status-text {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }
  .field-value.priority-text {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }
  /* Audit info bar */
  .audit-info {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 6px;
    font-size: 9px;
    color: #94a3b8;
  }
  /* Signatures */
  .signature-area {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 40px;
  }
  .signature-box { text-align: center; }
  .signature-line {
    border-top: 1.5px solid #334155;
    margin-bottom: 5px;
    padding-top: 35px;
  }
  .signature-label {
    font-size: 9px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  /* Footer */
  .footer {
    position: fixed;
    bottom: 15px;
    left: 25px;
    right: 25px;
    text-align: center;
    font-size: 8px;
    color: #94a3b8;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
  }
  @media print {
    body { padding: 15px; }
    .footer { position: static; margin-top: 20px; }
    @page { margin: 1cm; size: A4; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="company">
      <div class="company-logo">${company.name.charAt(0)}</div>
      <div class="company-name">${company.name}</div>
      <div class="company-meta">
        ${company.address}<br>
        ${company.phone} · ${company.email}
        ${company.tax_number ? `<br>Tax Reg: ${company.tax_number}` : ''}
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-type">${register.name}</div>
      <div class="doc-number">${docNumber}</div>
      <div class="doc-date">Issued: ${formatDate(new Date().toISOString())}</div>
    </div>
  </div>

  ${statusVal || priorityVal ? `<div class="badges">
    ${statusVal ? `<div class="badge" style="background: ${statusColor(statusVal)};"><span class="badge-dot"></span>${escapeHtml(statusVal)}</div>` : ''}
    ${priorityVal ? `<div class="badge" style="background: ${priorityVal.toLowerCase() === 'critical' ? '#EF4444' : priorityVal.toLowerCase() === 'high' ? '#F59E0B' : priorityVal.toLowerCase() === 'medium' ? '#3B82F6' : '#10B981'};"><span class="badge-dot"></span>${escapeHtml(priorityVal)} Priority</div>` : ''}
  </div>` : ''}

  <div class="section-title">Record Details</div>
  <div class="fields-grid">
    <div>
      ${leftCols.map((c) => renderField(c, statusColor)).join('')}
    </div>
    <div>
      ${rightCols.filter((c) => c.type !== 'long_text').map((c) => renderField(c, statusColor)).join('')}
    </div>
  </div>

  <div class="audit-info">
    <span>Record ID: ${record.id.slice(-8)}</span>
    <span>Created: ${formatDateTime(record.createdAt)}</span>
    <span>Updated: ${formatDateTime(record.updatedAt)}</span>
    <span>By: ${record.createdBy || 'system'}</span>
  </div>

  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">Prepared By</div>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">Authorized Signature</div>
    </div>
  </div>

  <div class="footer">
    Generated by FMCore ERP · ${register.name} · ${docNumber} · ${formatDateTime(new Date().toISOString())}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
