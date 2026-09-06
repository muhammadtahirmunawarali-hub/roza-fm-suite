'use client';

// FMCore ERP — Saved Views dropdown
// Shows a dropdown to save/load/delete named filter views for a register.
import { useEffect, useState, useRef } from 'react';
import { savedViewsApi } from '@/lib/erp/api';
import type { SavedView } from '@/lib/erp/api';
import { useErpStore } from '@/lib/erp/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Bookmark, ChevronDown, Save, Trash2, Plus, Globe, Lock, X, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface CurrentFilters {
  search?: string;
  filters: Record<string, string>;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
}

interface Props {
  registerId: string;
  registerName: string;
  currentFilters: CurrentFilters;
  onApply: (filters: CurrentFilters) => void;
}

export function SavedViews({ registerId, registerName, currentFilters, onApply }: Props) {
  const { hasPermission } = useErpStore();
  const [views, setViews] = useState<SavedView[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canEdit = hasPermission(registerId, 'edit');

  useEffect(() => {
    if (open) loadViews();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const loadViews = async () => {
    setLoading(true);
    try {
      setViews(await savedViewsApi.list(registerId));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the view');
      return;
    }
    setSaving(true);
    try {
      await savedViewsApi.create({
        name: name.trim(),
        registerId,
        filters: currentFilters,
        isShared,
      });
      toast.success(`View "${name}" saved`);
      setName('');
      setIsShared(false);
      setSaveOpen(false);
      loadViews();
    } catch (e: any) {
      toast.error('Failed to save view', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleApply = (view: SavedView) => {
    onApply({
      search: view.filters.search || '',
      filters: view.filters.filters || {},
      sortField: view.filters.sortField || '',
      sortDir: view.filters.sortDir || 'asc',
    });
    setOpen(false);
    toast.success(`Applied view: ${view.name}`);
  };

  const handleDelete = async (view: SavedView) => {
    try {
      await savedViewsApi.remove(view.id);
      toast.success(`Deleted view: ${view.name}`);
      loadViews();
    } catch (e: any) {
      toast.error('Failed to delete view', { description: e.message });
    }
  };

  const hasActiveFilters = currentFilters.search ||
    Object.values(currentFilters.filters).some(Boolean) ||
    currentFilters.sortField;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          disabled={!canEdit && views.length === 0}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] border transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            open
              ? 'bg-[var(--erp-accent-dim)] border-[var(--erp-accent-border)] text-[var(--erp-accent)]'
              : 'bg-[var(--erp-bg-input)] border-[var(--erp-border)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]',
          )}
          title="Saved views"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Views</span>
          {views.length > 0 && (
            <span className="ml-0.5 px-1.5 rounded-full bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)] text-[9px]">
              {views.length}
            </span>
          )}
          <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div
            className="absolute top-full mt-1 left-0 w-72 bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg shadow-xl z-30 overflow-hidden"
            style={{ animation: 'dropdownIn 0.15s ease-out' }}
          >
            <style>{`@keyframes dropdownIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            <div className="px-3 py-2 border-b border-[var(--erp-border)] bg-[var(--erp-bg-secondary)] flex items-center justify-between">
              <div className="text-[11px] font-semibold text-[var(--erp-text)]">Saved Views</div>
              <span className="text-[10px] text-[var(--erp-text-muted)]">{views.length} saved</span>
            </div>

            <div className="max-h-[280px] overflow-y-auto">
              {loading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="w-4 h-4 text-[var(--erp-accent)] animate-spin" />
                </div>
              ) : views.length === 0 ? (
                <div className="p-4 text-center">
                  <Bookmark className="w-7 h-7 text-[var(--erp-text-muted)] mx-auto mb-1.5" />
                  <div className="text-[12px] font-medium text-[var(--erp-text)] mb-0.5">No saved views</div>
                  <p className="text-[10px] text-[var(--erp-text-muted)] max-w-[200px] mx-auto">
                    Apply filters and save them as a view for quick access later.
                  </p>
                </div>
              ) : (
                views.map((v) => (
                  <div
                    key={v.id}
                    className="group flex items-center gap-2 px-3 py-2 border-b border-[var(--erp-border)] last:border-b-0 hover:bg-[var(--erp-bg-hover)] transition-colors"
                  >
                    <button
                      onClick={() => handleApply(v)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-1.5">
                        {v.isShared ? (
                          <Globe className="w-3 h-3 text-[var(--erp-accent)] shrink-0" />
                        ) : (
                          <Lock className="w-3 h-3 text-[var(--erp-text-muted)] shrink-0" />
                        )}
                        <span className="text-[12px] font-medium text-[var(--erp-text)] truncate">{v.name}</span>
                      </div>
                      <div className="text-[9px] text-[var(--erp-text-muted)] truncate ml-4">
                        {v.filters.search ? `Search: "${v.filters.search}"` : 'No search'}
                        {Object.keys(v.filters.filters || {}).length > 0 && ` · ${Object.keys(v.filters.filters).length} filter(s)`}
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)] hover:bg-[var(--erp-bg-hover)] transition-all"
                      title="Delete view"
                      aria-label={`Delete view ${v.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {canEdit && (
              <div className="p-2 border-t border-[var(--erp-border)] bg-[var(--erp-bg-secondary)]">
                <button
                  onClick={() => { setSaveOpen(true); setOpen(false); }}
                  disabled={!hasActiveFilters}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Current View{!hasActiveFilters ? ' (no filters)' : ''}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save view modal */}
      <Dialog open={saveOpen} onOpenChange={(o) => !o && !saving && setSaveOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[var(--erp-accent)]" />
              Save View
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] mb-1">View Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-[12px] h-9 bg-[var(--erp-bg-input)]"
                placeholder="e.g. Critical Open WOs"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
              <Checkbox
                id="shared-view"
                checked={isShared}
                onCheckedChange={(v) => setIsShared(!!v)}
              />
              <Label htmlFor="shared-view" className="text-[12px] cursor-pointer flex-1">
                Share with all users
              </Label>
              {isShared ? <Globe className="w-3.5 h-3.5 text-[var(--erp-accent)]" /> : <Lock className="w-3.5 h-3.5 text-[var(--erp-text-muted)]" />}
            </div>
            <div className="p-2.5 rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)]">
              <div className="text-[10px] uppercase text-[var(--erp-text-muted)] mb-1">View will capture:</div>
              <ul className="text-[11px] text-[var(--erp-text-secondary)] space-y-0.5">
                {currentFilters.search && <li>• Search: "{currentFilters.search}"</li>}
                {Object.entries(currentFilters.filters).filter(([, v]) => v).map(([k, v]) => (
                  <li key={k}>• Filter: {k} = {v}</li>
                ))}
                {currentFilters.sortField && <li>• Sort: {currentFilters.sortField} ({currentFilters.sortDir})</li>}
                {!hasActiveFilters && <li className="text-[var(--erp-text-muted)]">No active filters to save</li>}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
