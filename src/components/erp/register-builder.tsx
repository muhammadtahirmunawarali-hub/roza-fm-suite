'use client';

// Roza FM Suite — Register Builder Modal
// Lets users create new registers with custom columns (Form Builder pattern)
import { useState } from 'react';
import { registersApi, COLUMN_TYPE_META } from '@/lib/erp/api';
import type { ColumnDef, ColumnType, RegisterCategory } from '@/lib/erp/types';
import { REGISTER_CATEGORIES } from '@/lib/erp/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useErpStore } from '@/lib/erp/store';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAIcon } from './icon';

interface Props {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  initialCategory?: RegisterCategory;
}

const ICON_OPTIONS = [
  'fa-table', 'fa-clipboard-list', 'fa-file-lines', 'fa-list-check',
  'fa-gear', 'fa-shield-halved', 'fa-wrench', 'fa-building', 'fa-truck',
  'fa-users', 'fa-chart-bar', 'fa-box', 'fa-bolt', 'fa-snowflake', 'fa-fire-extinguisher',
  'fa-id-card', 'fa-graduation-cap', 'fa-calendar-check', 'fa-calendar-minus',
  'fa-truck-field', 'fa-cart-shopping', 'fa-boxes-stacked', 'fa-warehouse',
  'fa-city', 'fa-gears', 'fa-ruler-combined', 'fa-broom', 'fa-chart-line',
  'fa-file-contract', 'fa-burst', 'fa-triangle-exclamation', 'fa-file-signature',
  'fa-magnifying-glass', 'fa-comments', 'fa-clock-rotate-left', 'fa-hammer',
  'fa-plug', 'fa-fire', 'fa-coins',
];

const COLOR_OPTIONS = ['#00D4AA', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#EC4899', '#06B6D4', '#64748B'];

export function RegisterBuilder({ open, onClose, initialName, initialCategory }: Props) {
  const { openTab } = useErpStore();
  const [name, setName] = useState(initialName || '');
  const [category, setCategory] = useState<RegisterCategory>(initialCategory || 'operations');
  const [icon, setIcon] = useState('fa-table');
  const [color, setColor] = useState('#00D4AA');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState<ColumnDef[]>([
    { name: 'Name', type: 'text', width: 160 },
    { name: 'Status', type: 'status', width: 100, options: ['Open', 'In Progress', 'Completed'] },
  ]);
  const [saving, setSaving] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);

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

  // Drag and drop reorder
  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number, rowEl: HTMLElement) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      setDragOverIdx(idx);
      const rect = rowEl.getBoundingClientRect();
      setDragPosition(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
    }
  };
  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) { resetDrag(); return; }
    let insertAt = idx;
    if (dragPosition === 'after') insertAt += 1;
    if (draggedIdx < insertAt) insertAt -= 1;
    setColumns((cols) => { const n = [...cols]; const [m] = n.splice(draggedIdx, 1); n.splice(insertAt, 0, m); return n; });
    resetDrag();
  };
  const resetDrag = () => { setDraggedIdx(null); setDragOverIdx(null); setDragPosition(null); };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Please enter a register name'); return; }
    if (columns.length === 0) { toast.error('Add at least one column'); return; }
    // Ensure auto_increment or required columns exist
    const hasId = columns.some((c) => c.type === 'auto_increment');
    const finalCols = hasId ? columns : [{ name: 'ID', type: 'auto_increment' as ColumnType, width: 80 }, ...columns];
    setSaving(true);
    try {
      const reg = await registersApi.create({ name, category, icon, color, description, columns: finalCols });
      toast.success(`Register "${name}" created`);
      openTab({ id: `reg_${reg.id}`, type: 'register', label: reg.name, icon: reg.icon, refId: reg.id });
      // Reset + close
      setName(''); setColumns([{ name: 'Name', type: 'text', width: 160 }]); setDescription('');
      onClose();
    } catch (e: any) {
      toast.error('Failed to create register', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[var(--erp-accent)]" /> Create New Register
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2 space-y-4">
          {/* Top: name / category / icon / color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-[11px] mb-1">Register Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vehicle Inspection"
                className="text-[12px] h-9 bg-[var(--erp-bg-input)]"
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as RegisterCategory)}>
                <SelectTrigger className="text-[12px] h-9 bg-[var(--erp-bg-input)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(REGISTER_CATEGORIES).map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-[12px]">
                      <span className="flex items-center gap-1.5">
                        <FAIcon name={c.icon} style={{ color: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] mb-1">Color</Label>
              <div className="flex items-center gap-1 h-9 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-[var(--erp-accent)] scale-110' : ''}`}
                    style={{ background: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-[11px] mb-1">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Briefly describe what this register tracks..."
              className="text-[12px] resize-none bg-[var(--erp-bg-input)]"
            />
          </div>

          <div>
            <Label className="text-[11px] mb-1">Icon</Label>
            <div className="flex flex-wrap gap-1 p-2 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)] max-h-[100px] overflow-y-auto">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                    icon === ic ? 'bg-[var(--erp-accent-dim)] text-[var(--erp-accent)]' : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]'
                  }`}
                  title={ic}
                >
                  <FAIcon name={ic} className="text-[12px]" />
                </button>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[11px]">Columns ({columns.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addColumn} className="h-7 text-[11px]">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Column
              </Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx, e.currentTarget as HTMLElement)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={resetDrag}
                  className={cn(
                    "grid grid-cols-12 gap-2 items-start p-2 rounded-md border bg-[var(--erp-bg-card)] transition-all",
                    draggedIdx === idx ? "opacity-40 border-[var(--erp-accent)]" : "border-[var(--erp-border)]",
                    dragOverIdx === idx && dragPosition === 'before' && "border-t-2 border-t-[var(--erp-accent)]",
                    dragOverIdx === idx && dragPosition === 'after' && "border-b-2 border-b-[var(--erp-accent)]",
                  )}
                >
                  <div className="col-span-1 flex flex-col items-center gap-0.5 pt-2">
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, -1)}
                      disabled={idx === 0}
                      className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] disabled:opacity-30"
                      aria-label="Move up"
                    >▲</button>
                    <GripVertical className="w-3 h-3 text-[var(--erp-text-muted)]" />
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, 1)}
                      disabled={idx === columns.length - 1}
                      className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] disabled:opacity-30"
                      aria-label="Move down"
                    >▼</button>
                  </div>
                  <div className="col-span-4">
                    <input
                      value={col.name}
                      onChange={(e) => updateColumn(idx, { name: e.target.value })}
                      className="w-full text-[12px] h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] focus:outline-none focus:border-[var(--erp-accent)]"
                      placeholder="Column name"
                    />
                  </div>
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
                  <div className="col-span-3">
                    {COLUMN_TYPE_META[col.type].needsOptions ? (
                      <input
                        value={(col.options || []).join(', ')}
                        onChange={(e) => updateColumn(idx, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        className="w-full text-[11px] h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] focus:outline-none focus:border-[var(--erp-accent)]"
                        placeholder="Option1, Option2, ..."
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
                  <div className="col-span-1 flex items-center justify-center pt-1">
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
                  No columns yet. Click "Add Column" to start building.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[var(--erp-border)] pt-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
            {saving ? 'Creating...' : 'Create Register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
