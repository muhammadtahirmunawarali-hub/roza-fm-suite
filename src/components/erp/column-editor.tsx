'use client';

// FMCore ERP — Column Editor Modal (with drag-and-drop reordering)
// Allows editing columns of an existing register (rename, retype, add, delete, drag-reorder)
import { useState, useCallback, useRef } from 'react';
import { registersApi, COLUMN_TYPE_META } from '@/lib/erp/api';
import type { Register, ColumnDef, ColumnType } from '@/lib/erp/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Plus, Trash2, GripVertical, Save, X, Loader2, AlertTriangle, Settings2,
  ArrowUp, ArrowDown, HelpCircle, RotateCcw, Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAIcon } from './icon';

// Human-readable descriptions shown in the `?` tooltip next to the column type dropdown.
const COLUMN_DESCRIPTIONS: Record<ColumnType, string> = {
  auto_increment: 'Auto-incrementing sequence number (read-only)',
  text: 'Single-line text input',
  long_text: 'Multi-line textarea for notes/descriptions',
  number: 'Numeric value (integer or decimal)',
  currency: 'Monetary value with global currency prefix',
  percentage: 'Percentage value 0-100',
  date: 'Date picker (calendar)',
  datetime: 'Date and time picker',
  time: 'Time picker (HH:MM)',
  dropdown: 'Single-select from predefined options',
  status: 'Workflow status (e.g. Draft, Submitted, Approved)',
  priority: 'Priority level (e.g. Low, Medium, High, Critical)',
  multi_select: 'Multi-select from predefined options',
  email: 'Email address with validation',
  phone: 'Phone number',
  rating: '1-5 star rating',
  employee: 'Linked employee from HR',
  department: 'Linked department',
  building: 'Linked building/location',
  asset: 'Linked asset from Asset Register',
  equipment: 'Linked equipment',
  vendor: 'Linked vendor from Vendor Register',
  image: 'Image upload (before/after photos, product images)',
  url: 'Web URL / link',
  color: 'Color picker (hex value)',
  tags: 'Multi-select tag input',
};

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
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);

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

  // Drag and drop handlers
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number, rowEl: HTMLElement) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      setDragOverIdx(idx);
      // Compute whether the cursor is in the top or bottom half of the target row.
      const rect = rowEl.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      setDragPosition(e.clientY < midpoint ? 'before' : 'after');
    }
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      setDragPosition(null);
      return;
    }
    // Compute effective insertion index: when dropping "after" on a later row,
    // account for the removal of the dragged item shifting indices.
    let insertAt = idx;
    if (dragPosition === 'after') insertAt += 1;
    if (draggedIdx < insertAt) insertAt -= 1;
    setColumns((cols) => {
      const next = [...cols];
      const [moved] = next.splice(draggedIdx, 1);
      next.splice(insertAt, 0, moved);
      return next;
    });
    setDraggedIdx(null);
    setDragOverIdx(null);
    setDragPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    setDragPosition(null);
  };

  const resetToOriginal = () => {
    if (!register) return;
    setColumns(JSON.parse(JSON.stringify(register.columns)));
    toast.info('Columns reset to original state');
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
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] text-[10px] font-bold">
              {columns.length}
            </span>
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetToOriginal}
                disabled={saving}
                className="h-7 text-[11px] text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]"
                title="Restore columns to the register's original state"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset to Original
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addColumn} className="h-7 text-[11px]">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Column
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {columns.map((col, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx, e.currentTarget as HTMLElement)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'grid grid-cols-12 gap-2 items-start p-2 rounded-md border transition-all cursor-move',
                  draggedIdx === idx
                    ? 'opacity-50 border-[var(--erp-accent)]'
                    : dragOverIdx === idx
                    ? cn(
                        'border-[var(--erp-accent)] bg-[var(--erp-accent-dim)]',
                        dragPosition === 'before' && 'border-t-[3px] border-t-[var(--erp-accent)]',
                        dragPosition === 'after' && 'border-b-[3px] border-b-[var(--erp-accent)]',
                      )
                    : 'border-[var(--erp-border)] bg-[var(--erp-bg-card)]',
                )}
              >
                {/* Drag handle + Move buttons */}
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
                <div className="col-span-3 flex items-center gap-1">
                  <select
                    value={col.type}
                    onChange={(e) => updateColumn(idx, { type: e.target.value as ColumnType })}
                    className="w-full text-[11px] h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] focus:outline-none focus:border-[var(--erp-accent)]"
                  >
                    {Object.entries(COLUMN_TYPE_META).map(([t, meta]) => (
                      <option key={t} value={t}>{meta.label}</option>
                    ))}
                  </select>
                  <span
                    title={COLUMN_DESCRIPTIONS[col.type]}
                    className="shrink-0 cursor-help text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] transition-colors"
                    aria-label={`Description of ${col.type} column type: ${COLUMN_DESCRIPTIONS[col.type]}`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
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

                {/* Column preview line — ghost view of how the column appears in the grid */}
                <div className="col-span-12 -mt-1 mb-1 flex items-center gap-1.5 text-[10px] text-[var(--erp-text-muted)] pl-1">
                  <FAIcon name={COLUMN_TYPE_META[col.type].icon} className="text-[8px]" />
                  <span className="truncate max-w-[200px]">{col.name || 'unnamed'}</span>
                  <span className="opacity-60">· {col.width || 120}px · {col.required ? 'required' : 'optional'}</span>
                </div>
              </div>
            ))}
            {columns.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--erp-bg-hover)] flex items-center justify-center">
                  <Inbox className="w-6 h-6 text-[var(--erp-text-muted)]" />
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-[var(--erp-text)]">No columns yet</p>
                  <p className="text-[11px] text-[var(--erp-text-muted)]">
                    Start building your register by adding the first column.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addColumn} className="h-8 text-[12px]">
                  <Plus className="w-4 h-4 mr-1" /> Add First Column
                </Button>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <p className="text-[10px] text-[var(--erp-text-muted)] pl-1 pt-1">
            Tip: Drag the grip handle to reorder. Use ↑↓ arrows for precise moves. Press * to toggle required.
          </p>
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
