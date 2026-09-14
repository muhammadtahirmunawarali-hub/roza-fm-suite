'use client';

// Roza FM Suite — Bulk Actions bar
// Shown when one or more rows are selected in the register view.
// Provides: Select All, Clear Selection, Bulk Delete, Bulk Export, Print Selected
import { useState } from 'react';
import { recordsApi } from '@/lib/erp/api';
import type { Register, RecordData } from '@/lib/erp/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Trash2, Download, Printer, X, CheckSquare } from 'lucide-react';

interface Props {
  register: Register;
  selectedIds: Set<string>;
  selectedRecords: RecordData[];
  totalRecords: number;
  onClear: () => void;
  onRefresh: () => void;
  onPrint: (records: RecordData[]) => void;
}

export function BulkActions({ register, selectedIds, selectedRecords, totalRecords, onClear, onRefresh, onPrint }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const count = selectedIds.size;
  if (count === 0) return null;

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      let ok = 0;
      let failed = 0;
      for (const rec of selectedRecords) {
        try {
          await recordsApi.remove(register.id, rec.id);
          ok++;
        } catch {
          failed++;
        }
      }
      if (ok > 0) toast.success(`Deleted ${ok} record(s)`);
      if (failed > 0) toast.error(`Failed to delete ${failed} record(s)`);
      setConfirmDelete(false);
      onClear();
      onRefresh();
    } catch (e: any) {
      toast.error('Bulk delete failed', { description: e.message });
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkExport = () => {
    const headers = register.columns.map((c) => c.name);
    const rows = selectedRecords.map((r) =>
      register.columns.map((c) => {
        const v = r.data[c.name];
        if (Array.isArray(v)) return `"${v.join(', ')}"`;
        if (v === undefined || v === null) return '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }),
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${register.code}_selected_${count}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${count} selected record(s)`);
  };

  const allSelected = count === totalRecords;

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-[var(--erp-border)] bg-[var(--erp-accent-dim)] text-[12px] flex-wrap"
        role="toolbar"
        aria-label="Bulk actions"
      >
        <div className="flex items-center gap-1.5 text-[var(--erp-accent)] font-medium">
          <CheckSquare className="w-3.5 h-3.5" />
          <span>{count} selected {allSelected ? `(all ${totalRecords})` : `of ${totalRecords}`}</span>
        </div>

        <div className="h-4 w-px bg-[var(--erp-border)]" />

        <Button variant="outline" size="sm" onClick={handleBulkExport} className="h-7 text-[11px]">
          <Download className="w-3.5 h-3.5 mr-1" /> Export Selected
        </Button>

        <Button variant="outline" size="sm" onClick={() => onPrint(selectedRecords)} className="h-7 text-[11px]" disabled={count > 5}>
          <Printer className="w-3.5 h-3.5 mr-1" /> Print {count > 5 ? '(max 5)' : 'Selected'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          className="h-7 text-[11px] border-[var(--erp-danger)]/40 text-[var(--erp-danger)] hover:bg-[var(--erp-danger)] hover:text-white"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
        </Button>

        <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-[11px] ml-auto">
          <X className="w-3.5 h-3.5 mr-1" /> Clear
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} record(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {count} record(s) from "{register.name}".
              This action soft-deletes the records — they will be hidden but preserved in the audit log.
              This cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-[var(--erp-danger)] hover:bg-[var(--erp-danger)]/90"
            >
              {deleting ? 'Deleting...' : `Delete ${count} Record(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
