'use client';

// FMCore ERP — Record Form Modal (create / edit) with sectioned layout
import { useEffect, useMemo, useState } from 'react';
import { recordsApi, masterDataApi } from '@/lib/erp/api';
import type { Register, RecordData, ColumnDef, ColumnType } from '@/lib/erp/types';
import { validateRecord, defaultValue } from '@/lib/erp/utils';
import { FAIcon } from './icon';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  register: Register;
  record: RecordData | null;
  onClose: () => void;
  onSaved: () => void;
}

// Column-type metadata for icons + grouping
const TYPE_META: Record<ColumnType, { icon: string; group: string; label: string }> = {
  auto_increment: { icon: 'fa-hashtag', group: 'Identification', label: 'Auto Number' },
  text: { icon: 'fa-font', group: 'Details', label: 'Text' },
  long_text: { icon: 'fa-align-left', group: 'Details', label: 'Long Text' },
  number: { icon: 'fa-hashtag', group: 'Metrics', label: 'Number' },
  currency: { icon: 'fa-coins', group: 'Financials', label: 'Currency' },
  percentage: { icon: 'fa-percent', group: 'Metrics', label: 'Percentage' },
  date: { icon: 'fa-calendar', group: 'Timeline', label: 'Date' },
  datetime: { icon: 'fa-calendar-days', group: 'Timeline', label: 'Date & Time' },
  time: { icon: 'fa-clock', group: 'Timeline', label: 'Time' },
  dropdown: { icon: 'fa-list', group: 'Classification', label: 'Dropdown' },
  status: { icon: 'fa-flag', group: 'Status', label: 'Status' },
  priority: { icon: 'fa-bolt', group: 'Status', label: 'Priority' },
  multi_select: { icon: 'fa-list-check', group: 'Classification', label: 'Multi-Select' },
  email: { icon: 'fa-envelope', group: 'Contact', label: 'Email' },
  phone: { icon: 'fa-phone', group: 'Contact', label: 'Phone' },
  rating: { icon: 'fa-star', group: 'Metrics', label: 'Rating' },
  employee: { icon: 'fa-user', group: 'Assignment', label: 'Employee' },
  department: { icon: 'fa-building-user', group: 'Assignment', label: 'Department' },
  building: { icon: 'fa-city', group: 'Location', label: 'Building' },
  asset: { icon: 'fa-cube', group: 'Location', label: 'Asset' },
  equipment: { icon: 'fa-gears', group: 'Location', label: 'Equipment' },
  vendor: { icon: 'fa-truck', group: 'Contact', label: 'Vendor' },
};

const SECTION_ORDER = ['Identification', 'Details', 'Classification', 'Status', 'Timeline', 'Assignment', 'Location', 'Contact', 'Financials', 'Metrics'];

const SECTION_ICONS: Record<string, string> = {
  Identification: 'fa-fingerprint',
  Details: 'fa-file-lines',
  Classification: 'fa-folder-tree',
  Status: 'fa-flag',
  Timeline: 'fa-calendar',
  Assignment: 'fa-user-gear',
  Location: 'fa-location-dot',
  Contact: 'fa-address-book',
  Financials: 'fa-coins',
  Metrics: 'fa-chart-simple',
};

export function RecordForm({ open, register, record, onClose, onSaved }: Props) {
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [masterData, setMasterData] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const md = await masterDataApi.list();
        if (!cancelled) setMasterData(md);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (open) {
      if (record) {
        setData({ ...record.data });
      } else {
        const init: Record<string, any> = {};
        register.columns.forEach((col) => {
          if (col.type !== 'auto_increment') init[col.name] = defaultValue(col);
        });
        setData(init);
      }
      setErrors({});
    }
  }, [open, record, register]);

  const setField = (name: string, value: any) => {
    setData((d) => ({ ...d, [name]: value }));
    setErrors((e) => { const n = { ...e }; delete n[name]; return n; });
  };

  const handleSubmit = async () => {
    const { valid, errors: errs } = validateRecord(data, register.columns);
    if (!valid) {
      setErrors(errs);
      toast.error('Please fix the errors before saving', {
        description: `${Object.keys(errs).length} field(s) need attention`,
      });
      return;
    }
    setSaving(true);
    try {
      if (record) {
        await recordsApi.update(register.id, record.id, data);
        toast.success('Record updated successfully');
      } else {
        await recordsApi.create(register.id, data);
        toast.success('Record created successfully');
      }
      onSaved();
    } catch (e: any) {
      toast.error('Failed to save record', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  // Group columns by section
  const cols = register.columns.filter((c) => c.type !== 'auto_increment');
  const sections = useMemo(() => {
    const groups: Record<string, ColumnDef[]> = {};
    cols.forEach((col) => {
      const meta = TYPE_META[col.type];
      const grp = meta?.group || 'Details';
      (groups[grp] = groups[grp] || []).push(col);
    });
    // Sort sections by SECTION_ORDER, then any others
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      const ai = SECTION_ORDER.indexOf(a);
      const bi = SECTION_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return sorted;
  }, [cols]);

  const errorCount = Object.keys(errors).length;
  const filledCount = cols.filter((c) => {
    const v = data[c.name];
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progressPct = cols.length === 0 ? 100 : Math.round((filledCount / cols.length) * 100);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FAIcon name={register.icon} style={{ color: register.color }} />
            {record ? `Edit Record #${record.sequence}` : `Add Record to ${register.name}`}
          </DialogTitle>
          <div className="text-[11px] text-[var(--erp-text-muted)] -mt-1">
            {cols.length} fields · {filledCount} filled {errorCount > 0 && (
              <span className="text-[var(--erp-danger)]">· {errorCount} error{errorCount === 1 ? '' : 's'}</span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 rounded-full bg-[var(--erp-bg-input)] overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${progressPct}%`,
                background: errorCount > 0 ? 'var(--erp-danger)' : 'var(--erp-accent)',
              }}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {sections.map(([sectionName, sectionCols]) => (
            <div key={sectionName}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[var(--erp-border)]">
                <FAIcon name={SECTION_ICONS[sectionName] || 'fa-folder'} className="text-[10px] text-[var(--erp-text-muted)]" />
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--erp-text-muted)]">{sectionName}</h3>
                <span className="text-[9px] text-[var(--erp-text-muted)]/70 ml-auto">{sectionCols.length} field{sectionCols.length === 1 ? '' : 's'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sectionCols.map((col) => (
                  <FieldRenderer
                    key={col.name}
                    col={col}
                    value={data[col.name]}
                    error={errors[col.name]}
                    masterData={masterData}
                    onChange={(v) => setField(col.name, v)}
                    fullWidth={col.type === 'long_text' || col.type === 'multi_select'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="border-t border-[var(--erp-border)] pt-3">
          {errorCount > 0 && (
            <div className="mr-auto flex items-center gap-2 text-[11px] text-[var(--erp-danger)]">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorCount} field{errorCount === 1 ? '' : 's'} need attention
            </div>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-9">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="h-9 bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : (record ? 'Update Record' : 'Create Record')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRenderer({
  col, value, error, masterData, onChange, fullWidth,
}: {
  col: ColumnDef;
  value: any;
  error?: string;
  masterData: Record<string, string[]>;
  onChange: (v: any) => void;
  fullWidth?: boolean;
}) {
  const meta = TYPE_META[col.type];
  const label = (
    <Label className="text-[11px] font-medium text-[var(--erp-text-secondary)] flex items-center gap-1.5 mb-1">
      <FAIcon name={meta?.icon || 'fa-circle'} className="text-[10px] text-[var(--erp-text-muted)]" />
      <span>{col.name}</span>
      {col.required && <span className="text-[var(--erp-danger)]">*</span>}
    </Label>
  );

  const errorEl = error ? (
    <p className="text-[10px] text-[var(--erp-danger)] mt-0.5 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" /> {error}
    </p>
  ) : null;

  const wrapperClass = cn('flex flex-col', fullWidth && 'sm:col-span-2');

  switch (col.type) {
    case 'long_text':
      return (
        <div className={wrapperClass}>
          {label}
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="text-[12px] resize-y bg-[var(--erp-bg-input)] focus-visible:ring-[var(--erp-accent-border)]"
            placeholder={`Enter ${col.name.toLowerCase()}...`}
          />
          {errorEl}
        </div>
      );
    case 'dropdown':
    case 'status':
    case 'priority':
      return (
        <div className={wrapperClass}>
          {label}
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className="text-[12px] h-9 bg-[var(--erp-bg-input)]">
              <SelectValue placeholder={`Select ${col.name.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {(col.options || []).map((o) => (
                <SelectItem key={o} value={o} className="text-[12px]">{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorEl}
        </div>
      );
    case 'employee':
    case 'department':
    case 'building':
    case 'asset':
    case 'equipment':
    case 'vendor':
      return (
        <div className={wrapperClass}>
          {label}
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className="text-[12px] h-9 bg-[var(--erp-bg-input)]">
              <SelectValue placeholder={`Select ${col.type}...`} />
            </SelectTrigger>
            <SelectContent>
              {(masterData[col.type] || []).map((o) => (
                <SelectItem key={o} value={o} className="text-[12px]">{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorEl}
        </div>
      );
    case 'multi_select':
      return (
        <div className={wrapperClass}>
          {label}
          <MultiSelectField
            options={col.options || masterData[col.type] || []}
            value={Array.isArray(value) ? value : (value ? [value] : [])}
            onChange={onChange}
          />
          {errorEl}
        </div>
      );
    case 'date':
      return (
        <div className={wrapperClass}>
          {label}
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-[12px] h-9 bg-[var(--erp-bg-input)]"
          />
          {errorEl}
        </div>
      );
    case 'datetime':
      return (
        <div className={wrapperClass}>
          {label}
          <Input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-[12px] h-9 bg-[var(--erp-bg-input)]"
          />
          {errorEl}
        </div>
      );
    case 'time':
      return (
        <div className={wrapperClass}>
          {label}
          <Input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-[12px] h-9 bg-[var(--erp-bg-input)]"
          />
          {errorEl}
        </div>
      );
    case 'number':
    case 'currency':
    case 'percentage':
      return (
        <div className={wrapperClass}>
          {label}
          <div className="relative">
            {col.type === 'currency' && (
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[var(--erp-text-muted)] pointer-events-none">AED</span>
            )}
            <Input
              type="number"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
              className={cn(
                'text-[12px] h-9 bg-[var(--erp-bg-input)] font-mono',
                col.type === 'currency' && 'pl-10',
                col.type === 'percentage' && 'pr-8',
              )}
              step={col.type === 'currency' ? '0.01' : col.type === 'percentage' ? '1' : 'any'}
              placeholder={col.type === 'currency' ? '0.00' : col.type === 'percentage' ? '0' : '0'}
            />
            {col.type === 'percentage' && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--erp-text-muted)] pointer-events-none">%</span>
            )}
          </div>
          {errorEl}
        </div>
      );
    case 'rating':
      return (
        <div className={wrapperClass}>
          {label}
          <RatingInput value={Number(value) || 0} onChange={onChange} />
          {errorEl}
        </div>
      );
    case 'email':
      return (
        <div className={wrapperClass}>
          {label}
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-[12px] h-9 bg-[var(--erp-bg-input)]"
            placeholder="name@example.com"
          />
          {errorEl}
        </div>
      );
    case 'phone':
      return (
        <div className={wrapperClass}>
          {label}
          <Input
            type="tel"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-[12px] h-9 bg-[var(--erp-bg-input)]"
            placeholder="+971-50-XXX-XXXX"
          />
          {errorEl}
        </div>
      );
    default:
      return (
        <div className={wrapperClass}>
          {label}
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-[12px] h-9 bg-[var(--erp-bg-input)]"
            placeholder={`Enter ${col.name.toLowerCase()}...`}
          />
          {errorEl}
        </div>
      );
  }
}

function MultiSelectField({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)] min-h-[36px] focus-within:border-[var(--erp-accent)]">
      {options.length === 0 ? (
        <span className="text-[11px] text-[var(--erp-text-muted)]">No options available</span>
      ) : (
        options.map((opt) => {
          const selected = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                'text-[11px] px-2 py-1 rounded-md transition-colors',
                selected
                  ? 'bg-[var(--erp-accent)] text-white'
                  : 'bg-[var(--erp-bg-card)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]',
              )}
            >
              {selected && '✓ '}
              {opt}
            </button>
          );
        })
      )}
    </div>
  );
}

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 h-9">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            'text-[20px] transition-colors hover:scale-110',
            n <= value ? 'text-[var(--erp-warning)]' : 'text-[var(--erp-text-muted)] hover:text-[var(--erp-warning)]',
          )}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-[11px] text-[var(--erp-text-muted)] font-mono">{value}/5</span>
    </div>
  );
}
