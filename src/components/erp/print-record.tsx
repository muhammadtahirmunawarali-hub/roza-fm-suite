'use client';

// FMCore ERP — Print Record Layout
// Opens a print-friendly view of any record (in a new window) with company header,
// document number, all fields, and signature area.
import type { Register, RecordData } from '@/lib/erp/types';
import { formatDocNumber, formatDate, formatDateTime } from '@/lib/erp/utils';

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

export function printRecord(register: Register, record: RecordData, company: PrintData['company']) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Please allow popups to print records');
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
    if (type === 'currency') return `AED ${Number(val).toLocaleString()}`;
    if (type === 'percentage') return `${val}%`;
    if (type === 'multi_select') return Array.isArray(val) ? val.join(', ') : String(val);
    if (type === 'rating') return `${'★'.repeat(Number(val) || 0)}${'☆'.repeat(5 - (Number(val) || 0))}`;
    return String(val);
  };

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
    font-size: 12px;
    line-height: 1.5;
    padding: 30px;
    background: #fff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid ${register.color};
  }
  .company { flex: 1; }
  .company-logo {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, ${register.color}, ${register.color}cc);
    color: white;
    font-size: 24px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    margin-bottom: 10px;
  }
  .company-name { font-size: 18px; font-weight: 600; color: #1a202c; margin-bottom: 4px; }
  .company-meta { font-size: 11px; color: #64748b; line-height: 1.6; }
  .doc-info { text-align: right; }
  .doc-type {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: ${register.color};
    font-weight: 600;
    margin-bottom: 4px;
  }
  .doc-number { font-size: 22px; font-weight: 700; color: #1a202c; margin-bottom: 6px; }
  .doc-date { font-size: 11px; color: #64748b; }
  .section-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748b;
    margin: 20px 0 10px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e2e8f0;
  }
  .fields-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 30px;
    margin-bottom: 20px;
  }
  .field { margin-bottom: 8px; }
  .field-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94a3b8;
    margin-bottom: 2px;
    font-weight: 600;
  }
  .field-value {
    font-size: 13px;
    color: #1a202c;
    font-weight: 500;
    word-wrap: break-word;
  }
  .long-text-field {
    grid-column: 1 / -1;
    padding: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 12px;
    color: #334155;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .audit-info {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
    padding: 10px 0;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #94a3b8;
  }
  .signature-area {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    margin-top: 60px;
  }
  .signature-box {
    text-align: center;
  }
  .signature-line {
    border-top: 1px solid #1a202c;
    margin-bottom: 6px;
    padding-top: 40px;
  }
  .signature-label {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .footer {
    position: fixed;
    bottom: 20px;
    left: 30px;
    right: 30px;
    text-align: center;
    font-size: 9px;
    color: #94a3b8;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
  }
  @media print {
    body { padding: 20px; }
    .footer { position: static; margin-top: 30px; }
  }
  @page { margin: 1.5cm; }
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

  <div class="section-title">Record Details</div>
  <div class="fields-grid">
    <div>
      ${leftCols.map((c) => `
        <div class="field ${c.type === 'long_text' ? 'long-text-field' : ''}">
          <div class="field-label">${c.name}</div>
          <div class="field-value">${escapeHtml(formatVal(record.data[c.name], c.type))}</div>
        </div>
      `).join('')}
    </div>
    <div>
      ${rightCols.filter((c) => c.type !== 'long_text').map((c) => `
        <div class="field">
          <div class="field-label">${c.name}</div>
          <div class="field-value">${escapeHtml(formatVal(record.data[c.name], c.type))}</div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="audit-info">
    <span>Record ID: ${record.id}</span>
    <span>Created: ${formatDateTime(record.createdAt)}</span>
    <span>Last Updated: ${formatDateTime(record.updatedAt)}</span>
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
    This document was generated by FMCore ERP on ${formatDateTime(new Date().toISOString())} · ${register.name} · ${docNumber}
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
