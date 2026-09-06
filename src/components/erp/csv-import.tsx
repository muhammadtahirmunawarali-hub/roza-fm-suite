'use client';

// FMCore ERP — CSV Import Modal
// Workflow: Select file → preview first 10 rows → map columns → validate → import
import { useState, useRef, useCallback } from 'react';
import { recordsApi } from '@/lib/erp/api';
import type { Register, ColumnDef } from '@/lib/erp/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Upload, FileText, CheckCircle2, AlertCircle, X, ArrowRight, Download, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  register: Register;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'upload' | 'preview' | 'mapping' | 'validating' | 'result';

export function CsvImport({ open, register, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // csvCol → registerCol
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number; errors: { row: number; error: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setFileName('');
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file');
      return;
    }
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        setError('CSV file is empty');
        return;
      }
      const parseLine = (line: string): string[] => {
        // simple CSV parser — handles quoted fields with commas
        const out: string[] = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
            else inQuote = !inQuote;
          } else if (c === ',' && !inQuote) {
            out.push(cur); cur = '';
          } else {
            cur += c;
          }
        }
        out.push(cur);
        return out.map((s) => s.trim());
      };
      const parsedHeaders = parseLine(lines[0]);
      const parsedRows = lines.slice(1).map(parseLine);
      setHeaders(parsedHeaders);
      setRawRows(parsedRows);

      // Auto-map: try to match CSV column names to register column names
      const initialMapping: Record<string, string> = {};
      parsedHeaders.forEach((h) => {
        const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = register.columns.find((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized);
        initialMapping[h] = match?.name || '__skip__';
      });
      setMapping(initialMapping);
      setStep('preview');
    } catch (e: any) {
      setError(`Failed to parse CSV: ${e.message}`);
    }
  }, [register]);

  const validateAndImport = async () => {
    setStep('validating');
    setImporting(true);
    setError(null);
    try {
      const records: Record<string, any>[] = rawRows.map((row) => {
        const rec: Record<string, any> = {};
        headers.forEach((h, i) => {
          const targetCol = mapping[h];
          if (!targetCol || targetCol === '__skip__') return;
          const colDef = register.columns.find((c) => c.name === targetCol);
          if (!colDef) return;
          const rawVal = row[i] || '';
          if (colDef.type === 'number' || colDef.type === 'currency' || colDef.type === 'percentage' || colDef.type === 'rating') {
            const n = Number(rawVal);
            rec[targetCol] = isNaN(n) ? 0 : n;
          } else if (colDef.type === 'multi_select') {
            rec[targetCol] = rawVal.split(';').map((s) => s.trim()).filter(Boolean);
          } else if (colDef.type === 'auto_increment') {
            // skip — server assigns
          } else {
            rec[targetCol] = rawVal;
          }
        });
        return rec;
      }).filter((r) => Object.keys(r).length > 0);

      if (records.length === 0) {
        setError('No valid records to import after mapping');
        setStep('mapping');
        setImporting(false);
        return;
      }

      const res = await recordsApi.bulkCreate(register.id, records);
      setResult({ imported: res.imported, failed: res.failed, errors: res.errors || [] });
      setStep('result');
      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} record(s) into ${register.name}`);
      }
    } catch (e: any) {
      setError(`Import failed: ${e.message}`);
      setStep('mapping');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = register.columns
      .filter((c) => c.type !== 'auto_increment')
      .map((c) => c.name);
    const sampleRow = register.columns
      .filter((c) => c.type !== 'auto_increment')
      .map((c) => {
        if (c.options && c.options.length) return c.options[0];
        if (c.type === 'number') return '0';
        if (c.type === 'currency') return '0.00';
        if (c.type === 'date') return '2025-01-15';
        if (c.type === 'multi_select') return 'Option1;Option2';
        return `Sample ${c.name}`;
      });
    const csv = [headers.join(','), sampleRow.map((v) => `"${v}"`).join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${register.code}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const mappedCount = Object.values(mapping).filter((v) => v && v !== '__skip__').length;
  const validRecords = rawRows.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o && !importing) { reset(); onClose(); } }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[var(--erp-accent)]" />
            Import CSV — {register.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {/* Stepper */}
          <div className="flex items-center gap-2 mb-4 text-[11px]">
            <StepBadge num={1} label="Upload" active={step === 'upload'} done={step !== 'upload'} />
            <ArrowRight className="w-3 h-3 text-[var(--erp-text-muted)]" />
            <StepBadge num={2} label="Preview & Map" active={step === 'preview' || step === 'mapping'} done={step === 'validating' || step === 'result'} />
            <ArrowRight className="w-3 h-3 text-[var(--erp-text-muted)]" />
            <StepBadge num={3} label="Validate" active={step === 'validating'} done={step === 'result'} />
            <ArrowRight className="w-3 h-3 text-[var(--erp-text-muted)]" />
            <StepBadge num={4} label="Result" active={step === 'result'} done={false} />
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-md bg-[rgba(239,68,68,0.1)] border border-[var(--erp-danger)]/30 flex items-start gap-2 text-[12px] text-[var(--erp-danger)]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
              <button onClick={() => setError(null)} className="text-[var(--erp-danger)] hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[var(--erp-accent)]'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-[var(--erp-accent)]'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-[var(--erp-accent)]');
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[var(--erp-border)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--erp-accent-border)] hover:bg-[var(--erp-accent-dim)] transition-colors"
              >
                <Upload className="w-10 h-10 text-[var(--erp-text-muted)] mx-auto mb-3" />
                <div className="text-[14px] font-medium text-[var(--erp-text)] mb-1">
                  Drop CSV file here or click to browse
                </div>
                <div className="text-[11px] text-[var(--erp-text-muted)]">
                  Accepts .csv files. First row should contain column headers.
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--erp-bg-input)] rounded-md border border-[var(--erp-border)]">
                <div className="text-[12px]">
                  <div className="font-medium text-[var(--erp-text)]">Need a template?</div>
                  <div className="text-[11px] text-[var(--erp-text-muted)]">Download a CSV template with the correct headers for this register.</div>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-[11px] h-8">
                  <Download className="w-3.5 h-3.5 mr-1" /> Template
                </Button>
              </div>
              <div className="text-[11px] text-[var(--erp-text-muted)] bg-[var(--erp-bg-input)] p-3 rounded-md border border-[var(--erp-border)]">
                <div className="font-medium text-[var(--erp-text-secondary)] mb-1">Tips for successful import:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Dates should be in <code className="px-1 bg-[var(--erp-bg)] rounded">YYYY-MM-DD</code> format</li>
                  <li>Multi-select values should be separated by semicolons (<code className="px-1 bg-[var(--erp-bg)] rounded">Value1;Value2</code>)</li>
                  <li>Numbers must not contain commas or currency symbols</li>
                  <li>Auto-number fields are assigned automatically — skip them in the CSV</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Map */}
          {(step === 'preview' || step === 'mapping') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--erp-bg-input)] text-[var(--erp-text-secondary)]">
                    <FileText className="w-3.5 h-3.5" /> {fileName}
                  </span>
                  <span className="text-[var(--erp-text-muted)]">·</span>
                  <span className="text-[var(--erp-text-secondary)]">{rawRows.length} rows detected</span>
                  <span className="text-[var(--erp-text-muted)]">·</span>
                  <span className="text-[var(--erp-accent)]">{mappedCount}/{headers.length} columns mapped</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { reset(); }} className="text-[11px] h-7">
                  Choose different file
                </Button>
              </div>

              {/* Mapping table */}
              <div className="border border-[var(--erp-border)] rounded-md overflow-hidden">
                <div className="bg-[var(--erp-bg-elevated)] px-3 py-2 border-b border-[var(--erp-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--erp-text-secondary)]">
                  Column Mapping
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {headers.map((h) => (
                    <div key={h} className="flex items-center gap-3 px-3 py-2 border-b border-[var(--erp-border)] last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-[var(--erp-text)] truncate">{h}</div>
                        <div className="text-[10px] text-[var(--erp-text-muted)] truncate">Sample: {rawRows[0]?.[headers.indexOf(h)] || '—'}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--erp-text-muted)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Select value={mapping[h] || '__skip__'} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}>
                          <SelectTrigger className="h-8 text-[12px] bg-[var(--erp-bg-input)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__" className="text-[12px] text-[var(--erp-text-muted)]">— Skip this column —</SelectItem>
                            {register.columns.filter((c) => c.type !== 'auto_increment').map((c) => (
                              <SelectItem key={c.name} value={c.name} className="text-[12px]">
                                {c.name} <span className="text-[10px] text-[var(--erp-text-muted)]">({c.type.replace('_', ' ')})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview first 5 rows */}
              <div className="border border-[var(--erp-border)] rounded-md overflow-hidden">
                <div className="bg-[var(--erp-bg-elevated)] px-3 py-2 border-b border-[var(--erp-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--erp-text-secondary)] flex items-center justify-between">
                  <span>Preview (first 5 rows)</span>
                  <span className="text-[10px] font-normal text-[var(--erp-text-muted)]">Showing mapped columns only</span>
                </div>
                <div className="overflow-x-auto max-h-[180px]">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-[var(--erp-bg-card)] border-b border-[var(--erp-border)]">
                      <tr>
                        {headers.filter((h) => mapping[h] && mapping[h] !== '__skip__').map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-medium text-[var(--erp-text-secondary)] whitespace-nowrap">
                            {mapping[h]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-[var(--erp-border)] last:border-b-0">
                          {headers.filter((h) => mapping[h] && mapping[h] !== '__skip__').map((h) => {
                            const idx = headers.indexOf(h);
                            return <td key={h} className="px-2 py-1.5 text-[var(--erp-text)] whitespace-nowrap">{row[idx] || '—'}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Validating */}
          {step === 'validating' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 text-[var(--erp-accent)] animate-spin mb-3" />
              <div className="text-[14px] font-medium text-[var(--erp-text)]">Importing {validRecords} records...</div>
              <div className="text-[11px] text-[var(--erp-text-muted)] mt-1">Please don't close this window</div>
            </div>
          )}

          {/* STEP 4: Result */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-[var(--erp-border)] rounded-md p-4 bg-[rgba(16,185,129,0.05)]">
                  <div className="flex items-center gap-2 text-[var(--erp-success)]">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>{result.imported}</span>
                  </div>
                  <div className="text-[11px] text-[var(--erp-text-secondary)] mt-1">Records imported successfully</div>
                </div>
                <div className={cn('border rounded-md p-4', result.failed > 0 ? 'bg-[rgba(239,68,68,0.05)] border-[var(--erp-danger)]/30' : 'bg-[var(--erp-bg-input)] border-[var(--erp-border)]')}>
                  <div className={cn('flex items-center gap-2', result.failed > 0 ? 'text-[var(--erp-danger)]' : 'text-[var(--erp-text-muted)]')}>
                    {result.failed > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    <span className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>{result.failed}</span>
                  </div>
                  <div className="text-[11px] text-[var(--erp-text-secondary)] mt-1">{result.failed > 0 ? 'Rows failed (see below)' : 'No failures'}</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="border border-[var(--erp-danger)]/30 rounded-md overflow-hidden">
                  <div className="bg-[rgba(239,68,68,0.1)] px-3 py-2 border-b border-[var(--erp-danger)]/30 text-[11px] font-semibold text-[var(--erp-danger)]">
                    Failed Rows
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <div key={i} className="px-3 py-2 border-b border-[var(--erp-border)] last:border-b-0 text-[11px] flex items-center gap-2">
                        <span className="font-mono text-[var(--erp-text-muted)]">Row {e.row}:</span>
                        <span className="text-[var(--erp-danger)]">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[var(--erp-border)] pt-3">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          )}
          {(step === 'preview' || step === 'mapping') && (
            <>
              <Button variant="outline" onClick={() => { reset(); }}>Back</Button>
              <Button
                onClick={validateAndImport}
                disabled={mappedCount === 0}
                className="bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]"
              >
                Import {rawRows.length} Records
              </Button>
            </>
          )}
          {step === 'result' && (
            <>
              <Button variant="outline" onClick={() => { reset(); }}>Import Another File</Button>
              <Button
                onClick={() => { onImported(); reset(); onClose(); }}
                className="bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]"
              >
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepBadge({ num, label, active, done }: { num: number; label: string; active?: boolean; done?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
      done && 'bg-[rgba(16,185,129,0.1)] text-[var(--erp-success)]',
      active && 'bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] font-medium',
      !active && !done && 'text-[var(--erp-text-muted)]',
    )}>
      <span className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
        done && 'bg-[var(--erp-success)] text-white',
        active && 'bg-[var(--erp-accent)] text-white',
        !active && !done && 'bg-[var(--erp-bg-hover)]',
      )}>
        {done ? '✓' : num}
      </span>
      <span>{label}</span>
    </div>
  );
}
