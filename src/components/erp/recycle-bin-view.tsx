'use client';

// Roza FM Suite — Recycle Bin View
// Shows all soft-deleted records with restore + permanent delete options.
import { useEffect, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RotateCcw, Trash2, Search, Inbox, Loader2, AlertTriangle } from 'lucide-react';
import { formatDateTime, formatTimeAgo } from '@/lib/erp/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface RecycleItem {
  id: string;
  registerId: string;
  registerName: string;
  registerCode: string;
  registerIcon: string;
  registerColor: string;
  sequence: number;
  data: Record<string, any>;
  deletedAt: string;
  createdAt: string;
}

export function RecycleBinView() {
  const { hasPermission, user } = useErpStore();
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRegister, setFilterRegister] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/erp/recycle-bin');
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } catch (e: any) {
      toast.error('Failed to load recycle bin', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadSafe = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/erp/recycle-bin');
        const data = await res.json();
        if (!cancelled && data.ok) setItems(data.items);
      } catch (e: any) {
        if (!cancelled) toast.error('Failed to load recycle bin', { description: e.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadSafe();
    return () => { cancelled = true; };
  }, []);

  const handleRestore = async (id: string) => {
    setRestoring(id);
    try {
      const res = await fetch(`/api/erp/recycle-bin?id=${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast.success('Record restored successfully');
        setItems(items.filter(i => i.id !== id));
      } else {
        toast.error('Restore failed', { description: data.error });
      }
    } catch (e: any) {
      toast.error('Restore failed', { description: e.message });
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async (id: string, name: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/erp/recycle-bin?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        toast.success('Record permanently deleted');
        setItems(items.filter(i => i.id !== id));
      } else {
        toast.error('Delete failed', { description: data.error });
      }
    } catch (e: any) {
      toast.error('Delete failed', { description: e.message });
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const canDelete = user?.role === 'Super Admin' || user?.role === 'Administrator';

  const filtered = items.filter(item => {
    if (filterRegister && item.registerCode !== filterRegister) return false;
    if (search) {
      const q = search.toLowerCase();
      const dataStr = JSON.stringify(item.data).toLowerCase();
      return dataStr.includes(q) || item.registerName.toLowerCase().includes(q);
    }
    return true;
  });

  const registers = [...new Set(items.map(i => ({ code: i.registerCode, name: i.registerName })))];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--erp-text)] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Inbox className="w-5 h-5 text-[var(--erp-text-muted)]" />
            Recycle Bin
          </h1>
          <p className="text-[12px] text-[var(--erp-text-muted)] mt-0.5">
            Deleted records are kept here. Restore them or permanently delete.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deleted records..."
              className="h-8 pl-8 pr-3 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)] text-[12px] w-[200px] focus:outline-none focus:border-[var(--erp-accent)]"
            />
          </div>
          <select
            value={filterRegister}
            onChange={(e) => setFilterRegister(e.target.value)}
            className="h-8 px-2 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)] text-[11px] focus:outline-none focus:border-[var(--erp-accent)]"
          >
            <option value="">All Registers</option>
            {registers.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="px-2.5 py-1 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)]">
          🗑️ {items.length} deleted record{items.length !== 1 ? 's' : ''}
        </span>
        <span className="px-2.5 py-1 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)]">
          📋 {registers.length} register{registers.length !== 1 ? 's' : ''} affected
        </span>
        <span className="px-2.5 py-1 rounded-md bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] text-[var(--erp-warning)]">
          ⚠️ Permanent delete cannot be undone
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--erp-accent)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="w-12 h-12 text-[var(--erp-text-muted)] mb-3" />
          <h3 className="text-[14px] font-semibold text-[var(--erp-text)]">Recycle Bin is empty</h3>
          <p className="text-[11px] text-[var(--erp-text-muted)] mt-1">
            Deleted records will appear here for recovery.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const preview = Object.entries(item.data).slice(0, 4).map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`).join(' · ');
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-card)] hover:border-[var(--erp-accent-border)] transition-colors"
              >
                {/* Register icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: item.registerColor + '20' }}
                >
                  <FAIcon name={item.registerIcon} className="text-[16px]" style={{ color: item.registerColor } as any} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-semibold text-[var(--erp-text)]">{item.registerName}</span>
                    <span className="text-[10px] text-[var(--erp-text-muted)] font-mono">#{item.sequence}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)]">
                      Deleted {formatTimeAgo(item.deletedAt)}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--erp-text-secondary)] mt-0.5 truncate">
                    {preview || 'No preview data'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRestore(item.id)}
                    disabled={restoring === item.id}
                    className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md text-[11px] font-medium border border-[var(--erp-accent-border)] text-[var(--erp-accent)] hover:bg-[var(--erp-accent-dim)] transition-colors disabled:opacity-50"
                  >
                    {restoring === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Restore
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => setConfirmDelete({ id: item.id, name: `${item.registerName} #${item.sequence}` })}
                      disabled={deleting === item.id}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-[var(--erp-border)] text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)] hover:border-[var(--erp-danger)] transition-colors disabled:opacity-50"
                      title="Permanently delete (cannot be undone)"
                    >
                      {deleting === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permanent delete confirmation dialog (replaces native confirm) */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[var(--erp-danger)]" />
              Permanently delete record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete <strong className="text-[var(--erp-text)]">{confirmDelete?.name}</strong>.
              This action <strong className="text-[var(--erp-danger)]">cannot be undone</strong>. The record will be permanently removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handlePermanentDelete(confirmDelete.id, confirmDelete.name)}
              className="bg-[var(--erp-danger)] hover:bg-[var(--erp-danger)]/90"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
