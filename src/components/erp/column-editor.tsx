'use client';

// FMCore ERP — Column Editor Modal
// Allows editing columns of an existing register (rename, retype, add, delete, reorder)
import { useState, useCallback } from 'react';
import { registersApi, COLUMN_TYPE_META } from '@/lib/erp/api';
import type { Register, ColumnDef, ColumnType } from '@/lib/erp/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Save, X, Loader2, AlertTriangle, Settings2, ArrowUp, ArrowDown } from 'lucide-react';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  register: Register | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ColumnEditor({ open, register, onClose, onSaved }: Props) {
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize columns when modal opens
  useCallback(() => {
    if (open && register && !initialized) {
      setColumns(JSON.parse(JSON.stringify(register.columns)));
      setInitialized(true);
    }
    if (!open) {
      setInitialized(false);
    }
  }, [open, register, initialized]);

  // Use effect pattern instead
  if (open && register && !initialized) {
    setColumns(JSON.parse(JSON.stringify(register.columns)));
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
  }

  const addColumn = () => {
    setColumns((c) => [...c, { name: `Column ${c.length + 1}`, type: 'text', width: 120 }]);
  };

  const updateColumn = (idx: number, patch: Partial<ColumnDef>) => {
    setColumns((cols) => cols.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeColumn = (idx: number) => {
    setColumns((cols) => cols.filter((_, i) => i !== idx));
  };

  const moveColumn = (idx: number, dir: -1 | 1) => {
    setColumns((cols) => {
      const next = [...cols];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return cols;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!register) return;
    if (columns.length === 0) {
      toast.error('At least one column is required');
      return;
    }
    // Validate column names
    const names = columns.map((c) => c.name.trim());
    if (names.some((n) => !n)) {
      toast.error('Column names cannot be empty');
      return;
    }
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      toast.error('Column names must be unique');
      return;
    }

    setSaving(true);
    try {
      await registersApi.update(register.id, { columns });
      toast.success(`Updated ${columns.length} columns for "${register.name}"`);
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error('Failed to update columns', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!register) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[var(--erp-accent)]" />
            Edit Columns — {register.name}
          </DialogTitle>
          <p className="text-[11px] text-[var(--erp-text-muted)] -mt-1">
            Add, remove, rename, or change the type of columns. Changes apply to all records in this register.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {/* Warning for system registers */}
          {register.isSystem && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-[rgba(245,158,11,0.1)] border border-[var(--erp-warning)]/30 text-[11px] text-[var(--erp-warning)]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>This is a system register. Column changes will affect existing records. Be careful when removing or renaming columns — existing data may become invisible.</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--erp-text-muted)]">
              Columns ({columns.length})
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={addColumn} className="h-7 text-[11px]">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Column
            </Button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {columns.map((col, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-start p-2 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-card)]"
              >
                {/* Move buttons */}
                <div className="col-span-1 flex flex-col items-center gap-0.5 pt-2">
                  <button
                    type="button"
                    onClick={() => moveColumn(idx, -1)}
                    disabled={idx === 0}
                    className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <GripVertical className="w-3 h-3 text-[var(--erp-text-muted)]" />
                  <button
                    type="button"
                    onClick={() => moveColumn(idx, 1)}
                    disabled={idx === columns.length - 1}
                    className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Column name */}
                <div className="col-span-4">
                  <input
                    value={col.name}
                    onChange={(e) => updateColumn(idx, { name: e.target.value })}
                    className="w-full text-[12px] h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] focus:outline-none focus:border-[var(--erp-accent)]"
                    placeholder="Column name"
                  />
                </div>

                {/* Column type */}
                <div className="col-span-3">
                  <select
                    value={col.type}
                    onChange={(e) => updateColumn(idx, { type: e.target.value as ColumnType })}
                    className="w-full text-[11px] h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] focus:outline-none focus:border-[var(--erp-accent)]"
                  >
                    {Object.entries(COLUMN_TYPE_META).map(([t, meta]) => (
                      <option key={t} value={t}>{meta.label}</option>
                    ))}
                  </select>
                </div>

                {/* Options or width */}
                <div className="col-span-3">
                  {COLUMN_TYPE_META[col.type].needsOptions ? (
                    <input
                      value={(col.options || []).join(', ')}
                      onChange={(e) => updateColumn(idx, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      className="w-full text-[11px] h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] focus:outline-none focus:border-[var(--erp-accent)]"
                      placeholder="Opt1, Opt2, ..."
                    />
                  ) : (
                    <input
                      type="number"
                      value={col.width || 120}
                      onChange={(e) => updateColumn(idx, { width: Number(e.target.value) || 120 })}
                      className="w-full text-[11px] h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] focus:outline-none focus:border-[var(--erp-accent)]"
                      placeholder="Width"
                    />
                  )}
                </div>

                {/* Required toggle + delete */}
                <div className="col-span-1 flex items-center justify-center gap-1 pt-1.5">
                  <button
                    type="button"
                    onClick={() => updateColumn(idx, { required: !col.required })}
                    className={cn(
                      'w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center transition-colors',
                      col.required
                        ? 'bg-[var(--erp-danger)] text-white'
                        : 'bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)]',
                    )}
                    title={col.required ? 'Required field (click to make optional)' : 'Optional field (click to make required)'}
                  >
                    *
                  </button>
                  <button
                    type="button"
                    onClick={() => removeColumn(idx)}
                    className="p-1 text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)]"
                    aria-label="Remove column"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {columns.length === 0 && (
              <div className="text-center py-6 text-[var(--erp-text-muted)] text-[12px]">
                No columns. Click "Add Column" to start.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-[var(--erp-border)] pt-3">
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-9 text-[12px]">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-9 text-[12px] bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            {saving ? 'Saving...' : 'Save Columns'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
