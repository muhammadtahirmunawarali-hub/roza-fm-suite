'use client';

// FMCore ERP — Approval Workflow Panel
// Shows current status + available transitions (Approve/Reject/Submit/etc.)
// based on the user's role permissions.
import { useEffect, useState } from 'react';
import { recordsApi } from '@/lib/erp/api';
import { useErpStore } from '@/lib/erp/store';
import type { Register, RecordData } from '@/lib/erp/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Send, X, Loader2, ArrowRight,
  Ban, Play, Pause, RefreshCw, Flag, AlertTriangle,
} from 'lucide-react';
import { FAIcon } from './icon';

interface Transition {
  action: string;
  to: string;
  label: string;
  variant: 'success' | 'danger' | 'warning' | 'info' | 'accent';
}

interface Props {
  open: boolean;
  register: Register;
  record: RecordData | null;
  onClose: () => void;
  onTransition: () => void;
}

export function ApprovalWorkflow({ open, register, record, onClose, onTransition }: Props) {
  const { hasPermission } = useErpStore();
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [confirmAction, setConfirmAction] = useState<Transition | null>(null);

  const canApprove = hasPermission(register.code, 'approve');
  const canEdit = hasPermission(register.code, 'edit');

  useEffect(() => {
    if (!open || !record) return;
    setLoading(true);
    setComment('');
    setConfirmAction(null);
    recordsApi.getTransitions(register.id, record.id).then((res) => {
      setCurrentStatus(res.currentStatus);
      setTransitions(res.availableActions || []);
    }).catch((e) => {
      console.error('Failed to load transitions', e);
    }).finally(() => setLoading(false));
  }, [open, record, register.id]);

  const handleTransition = async (t: Transition) => {
    if (!record) return;
    setActing(t.action);
    try {
      const res = await recordsApi.transition(register.id, record.id, t.action, comment || undefined);
      toast.success(`Status changed: ${res.transition.from} → ${res.transition.to}`);
      setConfirmAction(null);
      setComment('');
      onTransition();
    } catch (e: any) {
      const msg = e.message || 'Transition failed';
      toast.error('Action failed', { description: msg });
    } finally {
      setActing(null);
    }
  };

  if (!record) return null;

  const statusCol = register.columns.find((c) => c.type === 'status');
  if (!statusCol) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No Status Column</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-[var(--erp-text-secondary)]">
            This register doesn't have a status column, so approval workflows are not available.
          </p>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FAIcon name="fa-sitemap" style={{ color: register.color }} />
              Workflow — {register.name} #{record.sequence}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current status */}
            <div className="flex items-center gap-3 p-3 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
              <div className="text-[10px] uppercase tracking-wide text-[var(--erp-text-muted)]">Current Status</div>
              <div className="ml-auto">
                <StatusBadge status={currentStatus} />
              </div>
            </div>

            {/* Workflow visualization */}
            <div className="flex items-center justify-center gap-2 py-3 px-2 bg-[var(--erp-bg-input)] rounded-md border border-[var(--erp-border)]">
              {(['Draft', 'Submitted', 'Approved', 'Completed'] as const).map((s, i, arr) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex flex-col items-center gap-1 px-2 py-1.5 rounded-md transition-all',
                      s === currentStatus && 'bg-[var(--erp-accent-dim)] ring-2 ring-[var(--erp-accent-border)]',
                    )}
                  >
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                        s === currentStatus ? 'bg-[var(--erp-accent)] text-white' : 'bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)]',
                      )}
                    >
                      {i + 1}
                    </div>
                    <span className={cn('text-[10px] font-medium', s === currentStatus ? 'text-[var(--erp-accent)]' : 'text-[var(--erp-text-muted)]')}>
                      {s}
                    </span>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-[var(--erp-text-muted)]" />}
                </div>
              ))}
            </div>

            {/* Permission warning */}
            {!canApprove && !canEdit && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-[rgba(245,158,11,0.1)] border border-[var(--erp-warning)]/30 text-[11px] text-[var(--erp-warning)]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                You don't have permission to change this record's status. Contact an administrator.
              </div>
            )}

            {/* Available actions */}
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-[var(--erp-accent)] animate-spin" />
              </div>
            ) : transitions.length === 0 ? (
              <div className="text-center py-4 text-[12px] text-[var(--erp-text-muted)]">
                No actions available for status "{currentStatus}".
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-[11px] mb-2 block">Available Actions</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {transitions.map((t) => {
                      const disabled = !canApprove && !canEdit;
                      return (
                        <button
                          key={t.action}
                          onClick={() => !disabled && setConfirmAction(t)}
                          disabled={disabled || acting === t.action}
                          className={cn(
                            'flex items-center gap-2 p-2.5 rounded-md border text-[12px] font-medium transition-all',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            variantClasses(t.variant),
                          )}
                        >
                          {acting === t.action ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          ) : (
                            <ActionIcon action={t.action} className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="flex-1 text-left">{t.label}</span>
                          <span className="text-[9px] opacity-70">→ {t.to}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment (optional) */}
                <div>
                  <Label className="text-[11px] mb-1">Comment (optional)</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    placeholder="Add a note about this status change..."
                    className="text-[12px] resize-none bg-[var(--erp-bg-input)]"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={!!acting}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(o) => !o && !acting && setConfirmAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ActionIcon action={confirmAction?.action || ''} className="w-4 h-4" style={{ color: variantColor(confirmAction?.variant) }} />
              Confirm {confirmAction?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[12px] text-[var(--erp-text-secondary)]">
              You're about to change the status from <strong className="text-[var(--erp-text)]">{currentStatus}</strong> to{' '}
              <strong className={variantTextColor(confirmAction?.variant)}>{confirmAction?.to}</strong>.
            </p>
            {comment && (
              <div className="p-2.5 rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)]">
                <div className="text-[10px] uppercase text-[var(--erp-text-muted)] mb-1">Comment</div>
                <div className="text-[11px] text-[var(--erp-text)] italic">"{comment}"</div>
              </div>
            )}
            <div className="text-[11px] text-[var(--erp-text-muted)] flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              This action will be recorded in the audit log.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={!!acting}>Cancel</Button>
            <Button
              onClick={() => confirmAction && handleTransition(confirmAction)}
              disabled={!!acting}
              className={cn(variantButtonClasses(confirmAction?.variant))}
            >
              {acting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ActionIcon action={confirmAction?.action || ''} className="w-4 h-4 mr-1" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function variantClasses(variant?: string): string {
  switch (variant) {
    case 'success': return 'border-[var(--erp-success)]/40 bg-[rgba(16,185,129,0.1)] text-[var(--erp-success)] hover:bg-[var(--erp-success)] hover:text-white';
    case 'danger':  return 'border-[var(--erp-danger)]/40 bg-[rgba(239,68,68,0.1)] text-[var(--erp-danger)] hover:bg-[var(--erp-danger)] hover:text-white';
    case 'warning': return 'border-[var(--erp-warning)]/40 bg-[rgba(245,158,11,0.1)] text-[var(--erp-warning)] hover:bg-[var(--erp-warning)] hover:text-white';
    case 'accent':  return 'border-[var(--erp-accent)]/40 bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] hover:bg-[var(--erp-accent)] hover:text-white';
    default:        return 'border-[var(--erp-border)] bg-[var(--erp-bg-input)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]';
  }
}

function variantColor(variant?: string): string {
  switch (variant) {
    case 'success': return 'var(--erp-success)';
    case 'danger':  return 'var(--erp-danger)';
    case 'warning': return 'var(--erp-warning)';
    case 'accent':  return 'var(--erp-accent)';
    default:        return 'var(--erp-text-secondary)';
  }
}

function variantTextColor(variant?: string): string {
  return variantColor(variant);
}

function variantButtonClasses(variant?: string): string {
  switch (variant) {
    case 'success': return 'bg-[var(--erp-success)] hover:bg-[var(--erp-success)]/90 text-white';
    case 'danger':  return 'bg-[var(--erp-danger)] hover:bg-[var(--erp-danger)]/90 text-white';
    case 'warning': return 'bg-[var(--erp-warning)] hover:bg-[var(--erp-warning)]/90 text-white';
    case 'accent':  return 'bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)] text-white';
    default:        return 'bg-[var(--erp-bg-hover)] hover:bg-[var(--erp-bg-active)] text-[var(--erp-text)]';
  }
}

function ActionIcon({ action, className, style }: { action: string; className?: string; style?: React.CSSProperties }) {
  switch (action) {
    case 'approve':    return <CheckCircle2 className={className} style={style} />;
    case 'reject':     return <XCircle className={className} style={style} />;
    case 'submit':     return <Send className={className} style={style} />;
    case 'cancel':     return <Ban className={className} style={style} />;
    case 'reopen':     return <RefreshCw className={className} style={style} />;
    case 'start':      return <Play className={className} style={style} />;
    case 'complete':   return <Flag className={className} style={style} />;
    case 'hold':       return <Pause className={className} style={style} />;
    case 'resume':     return <Play className={className} style={style} />;
    case 'assign':     return <Send className={className} style={style} />;
    default:           return <ArrowRight className={className} style={style} />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let color = 'var(--erp-info)';
  if (['open', 'draft', 'submitted', 'pending'].includes(s)) color = 'var(--erp-warning)';
  else if (['in progress', 'active', 'approved'].includes(s)) color = 'var(--erp-success)';
  else if (['rejected', 'cancelled', 'expired'].includes(s)) color = 'var(--erp-danger)';
  else if (['completed', 'closed'].includes(s)) color = 'var(--erp-accent)';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: color + '20', color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {status || '—'}
    </span>
  );
}
