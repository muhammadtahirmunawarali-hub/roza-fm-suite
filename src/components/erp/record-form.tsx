'use client';

// FMCore ERP — Record Form Modal (create / edit)
import { useEffect, useMemo, useState } from 'react';
import { recordsApi, masterDataApi } from '@/lib/erp/api';
import type { Register, RecordData, ColumnDef } from '@/lib/erp/types';
import { validateRecord, defaultValue } from '@/lib/erp/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

interface Props {
  open: boolean;
  register: Register;
  record: RecordData | null;
  onClose: () => void;
  onSaved: () => void;
}

export function RecordForm({ open, register, record, onClose, onSaved }: Props) {
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [masterData, setMasterData] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!masterDataApi) return;
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
        // initialize with defaults
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

  // Group columns into a 2-column grid layout
  const cols = register.columns.filter((c) => c.type !== 'auto_increment');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {record ? `Edit Record #${record.sequence}` : `Add Record to ${register.name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cols.map((col) => (
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

        <DialogFooter className="border-t border-[var(--erp-border)] pt-3">
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
  const label = (
    <Label className="text-[11px] font-medium text-[var(--erp-text-secondary)] flex items-center gap-1 mb-1">
      {col.name}
      {col.required && <span className="text-[var(--erp-danger)]">*</span>}
      <span className="text-[9px] text-[var(--erp-text-muted)] font-normal lowercase">({col.type.replace('_', ' ')})</span>
    </Label>
  );

  const errorEl = error ? (
    <p className="text-[10px] text-[var(--erp-danger)] mt-0.5">{error}</p>
  ) : null;

  const wrapperClass = `flex flex-col ${fullWidth ? 'sm:col-span-2' : ''}`;

  switch (col.type) {
    case 'long_text':
      return (
        <div className={wrapperClass}>
          {label}
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="text-[12px] resize-y bg-[var(--erp-bg-input)]"
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
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className="text-[12px] h-9 bg-[var(--erp-bg-input)] font-mono"
            step={col.type === 'currency' ? '0.01' : col.type === 'percentage' ? '1' : 'any'}
            placeholder="0"
          />
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
    <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)] min-h-[36px]">
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
              className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                selected
                  ? 'bg-[var(--erp-accent)] text-white'
                  : 'bg-[var(--erp-bg-card)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]'
              }`}
            >
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
          className={`text-[18px] transition-colors ${n <= value ? 'text-[var(--erp-warning)]' : 'text-[var(--erp-text-muted)] hover:text-[var(--erp-warning)]'}`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-[11px] text-[var(--erp-text-muted)]">{value}/5</span>
    </div>
  );
}
