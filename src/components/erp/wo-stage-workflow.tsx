'use client';

// FMCore ERP — WO Stage Workflow Component
// Visual lifecycle tracker for Work Orders / Preventive Maintenance.
// Shows the 7-stage workflow (Open → Assigned → In Progress → On Hold → Completion → Closed → Cancelled)
// with auto-timestamps, completion notes, and quick transition buttons.
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { recordsApi } from '@/lib/erp/api';
import type { Register, RecordData } from '@/lib/erp/types';
import {
  Circle, UserCheck, Play, Pause, CheckCircle2, XCircle, Clock,
  ArrowRight, Loader2, FileText, Image as ImageIcon, Paperclip,
} from 'lucide-react';

// ---------- Stage definitions ----------
export type WOStage = 'Open' | 'Assigned' | 'In Progress' | 'On Hold' | 'Completion' | 'Closed' | 'Cancelled';

interface StageMeta {
  label: string;
  icon: typeof Circle;
  color: string;
  bgColor: string;
  borderColor: string;
  timestampField?: string;
  description: string;
}

const STAGES: Record<WOStage, StageMeta> = {
  'Open': {
    label: 'Open',
    icon: Circle,
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.1)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
    description: 'Work order created, awaiting assignment',
  },
  'Assigned': {
    label: 'Assigned',
    icon: UserCheck,
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    timestampField: 'Assigned At',
    description: 'Technician assigned, work scheduled',
  },
  'In Progress': {
    label: 'In Progress',
    icon: Play,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    timestampField: 'Started At',
    description: 'Technician on site, work underway',
  },
  'On Hold': {
    label: 'On Hold',
    icon: Pause,
    color: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    description: 'Work paused — awaiting parts, info, or approval',
  },
  'Completion': {
    label: 'Completion',
    icon: CheckCircle2,
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    timestampField: 'Completed At',
    description: 'Work completed, awaiting verification/sign-off',
  },
  'Closed': {
    label: 'Closed',
    icon: CheckCircle2,
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.15)',
    borderColor: 'rgba(5, 150, 105, 0.4)',
    timestampField: 'Closed At',
    description: 'Verified and closed',
  },
  'Cancelled': {
    label: 'Cancelled',
    icon: XCircle,
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    description: 'Work order cancelled',
  },
};

// Ordered stages for the visual pipeline (excluding Cancelled — that's a side branch)
const PIPELINE_ORDER: WOStage[] = ['Open', 'Assigned', 'In Progress', 'On Hold', 'Completion', 'Closed'];

// Valid next stages from each current stage
const VALID_TRANSITIONS: Record<WOStage, WOStage[]> = {
  'Open': ['Assigned', 'Cancelled'],
  'Assigned': ['In Progress', 'On Hold', 'Cancelled'],
  'In Progress': ['On Hold', 'Completion', 'Cancelled'],
  'On Hold': ['In Progress', 'Cancelled'],
  'Completion': ['Closed', 'In Progress'],
  'Closed': [],
  'Cancelled': [],
};

interface Props {
  register: Register;
  record: RecordData;
  onUpdated?: () => void;
}

export function WOStageWorkflow({ register, record, onUpdated }: Props) {
  const [transitioning, setTransitioning] = useState(false);
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  // Detect the stage field — could be 'WO Stage' or 'Status'
  const stageField = register.columns.find((c) => c.name === 'WO Stage')?.name
    || register.columns.find((c) => c.type === 'status')?.name
    || 'Status';

  const currentStage = (record.data[stageField] as WOStage) || 'Open';
  const stageMeta = STAGES[currentStage] || STAGES['Open'];

  // Get timestamp for a stage
  const getTimestamp = (stage: WOStage): string | null => {
    const meta = STAGES[stage];
    if (!meta.timestampField) return null;
    const val = record.data[meta.timestampField];
    if (!val) return null;
    return val;
  };

  // Transition to a new stage
  const transitionTo = async (newStage: WOStage, extraData?: Record<string, any>) => {
    if (newStage === currentStage) return;
    if (!VALID_TRANSITIONS[currentStage]?.includes(newStage)) {
      toast.error(`Cannot transition from "${currentStage}" to "${newStage}"`);
      return;
    }

    // If going to "On Hold", require a reason
    if (newStage === 'On Hold' && !holdReason.trim()) {
      setShowHoldDialog(true);
      return;
    }

    setTransitioning(true);
    try {
      const now = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      const updates: Record<string, any> = {
        [stageField]: newStage,
      };

      // Auto-stamp the timestamp field for the new stage
      const newMeta = STAGES[newStage];
      if (newMeta.timestampField) {
        updates[newMeta.timestampField] = now;
      }

      // If going to "On Hold", set the reason
      if (newStage === 'On Hold' && holdReason) {
        updates['On Hold Reason'] = holdReason;
      }

      // Merge extra data (e.g. completion notes)
      if (extraData) Object.assign(updates, extraData);

      // Update the record via the API
      // recordsApi.update sends { data: ... } in the body, so we pass the merged data object
      const mergedData = { ...record.data, ...updates };
      await recordsApi.update(register.id, record.id, mergedData);

      toast.success(`Stage → ${newStage}`, {
        description: newMeta.timestampField ? `${newMeta.timestampField}: ${now}` : undefined,
      });

      // Call onUpdated to refresh the parent
      if (onUpdated) onUpdated();
      setShowHoldDialog(false);
      setHoldReason('');
    } catch (e: any) {
      toast.error('Stage transition failed', { description: e.message });
    } finally {
      setTransitioning(false);
    }
  };

  // Check if a stage is complete (has timestamp or is before current)
  const isStageComplete = (stage: WOStage): boolean => {
    const stageIdx = PIPELINE_ORDER.indexOf(stage);
    const currentIdx = PIPELINE_ORDER.indexOf(currentStage);
    if (currentStage === 'Cancelled') return false;
    if (stageIdx === -1 || currentIdx === -1) return false;
    return stageIdx < currentIdx;
  };

  const isStageCurrent = (stage: WOStage): boolean => stage === currentStage;

  // Get valid next stages for the quick-action buttons
  const nextStages = VALID_TRANSITIONS[currentStage] || [];

  return (
    <div className="rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-card)] p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: stageMeta.bgColor, color: stageMeta.color, border: `1px solid ${stageMeta.borderColor}` }}
          >
            <stageMeta.icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[var(--erp-text)]">WO Stage: {currentStage}</div>
            <div className="text-[10px] text-[var(--erp-text-muted)]">{stageMeta.description}</div>
          </div>
        </div>
        {transitioning && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--erp-accent)]" />}
      </div>

      {/* Visual pipeline */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PIPELINE_ORDER.map((stage, idx) => {
          const meta = STAGES[stage];
          const complete = isStageComplete(stage);
          const current = isStageCurrent(stage);
          const ts = getTimestamp(stage);
          const StageIcon = meta.icon;

          return (
            <div key={stage} className="flex items-center shrink-0">
              {/* Stage node */}
              <div
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md border min-w-[80px]',
                  current && 'ring-2 ring-offset-1 ring-offset-[var(--erp-bg-card)]',
                )}
                style={{
                  background: current ? meta.bgColor : complete ? 'var(--erp-bg-input)' : 'transparent',
                  borderColor: current ? meta.borderColor : 'var(--erp-border)',
                  ...(current ? { ['--tw-ring-color' as any]: meta.color } : {}),
                }}
                title={meta.description + (ts ? ` — ${ts}` : '')}
              >
                <StageIcon
                  className="w-3.5 h-3.5"
                  style={{ color: current ? meta.color : complete ? meta.color : 'var(--erp-text-muted)' }}
                />
                <div
                  className="text-[9px] font-medium whitespace-nowrap"
                  style={{ color: current ? meta.color : complete ? 'var(--erp-text)' : 'var(--erp-text-muted)' }}
                >
                  {meta.label}
                </div>
                {ts && (
                  <div className="text-[8px] text-[var(--erp-text-muted)] font-mono whitespace-nowrap">
                    {ts.slice(11, 16)}
                  </div>
                )}
              </div>
              {/* Connector arrow */}
              {idx < PIPELINE_ORDER.length - 1 && (
                <ArrowRight
                  className="w-3 h-3 mx-0.5 shrink-0"
                  style={{
                    color: complete ? '#10B981' : 'var(--erp-text-muted)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Quick transition buttons */}
      {nextStages.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wide">Transition to:</span>
          {nextStages.map((stage) => {
            const meta = STAGES[stage];
            const StageIcon = meta.icon;
            return (
              <button
                key={stage}
                onClick={() => transitionTo(stage)}
                disabled={transitioning}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors disabled:opacity-50"
                style={{
                  borderColor: meta.borderColor,
                  color: meta.color,
                  background: meta.bgColor,
                }}
              >
                <StageIcon className="w-3 h-3" />
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Timestamps grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
        {(['Assigned', 'In Progress', 'Completion', 'Closed'] as WOStage[]).map((stage) => {
          const ts = getTimestamp(stage);
          const meta = STAGES[stage];
          return (
            <div
              key={stage}
              className="px-1.5 py-1 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)]"
              style={ts ? { borderColor: meta.borderColor } : {}}
            >
              <div className="text-[var(--erp-text-muted)] uppercase tracking-wide text-[8px]">{meta.timestampField || meta.label}</div>
              <div className={cn('font-mono', ts ? 'text-[var(--erp-text)]' : 'text-[var(--erp-text-muted)]')}>
                {ts ? ts.replace('T', ' ').slice(0, 16) : '—'}
              </div>
            </div>
          );
        })}
      </div>

      {/* On Hold reason (if currently on hold) */}
      {currentStage === 'On Hold' && record.data['On Hold Reason'] && (
        <div className="px-2 py-1.5 rounded-md border border-[rgba(168,85,247,0.3)] bg-[rgba(168,85,247,0.05)] text-[10px]">
          <span className="font-semibold text-[#A855F7]">On Hold Reason:</span>{' '}
          <span className="text-[var(--erp-text)]">{String(record.data['On Hold Reason'])}</span>
        </div>
      )}

      {/* Completion notes (if completed/closed) */}
      {(currentStage === 'Completion' || currentStage === 'Closed') && record.data['Completion Notes'] && (
        <div className="px-2 py-1.5 rounded-md border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)] text-[10px]">
          <div className="font-semibold text-[#10B981] flex items-center gap-1 mb-0.5">
            <FileText className="w-3 h-3" /> Completion Notes:
          </div>
          <div className="text-[var(--erp-text)] whitespace-pre-wrap">{String(record.data['Completion Notes'])}</div>
        </div>
      )}

      {/* Linked checklist indicator */}
      {record.data['Linked Checklist'] && (
        <div className="px-2 py-1.5 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)] text-[10px] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Paperclip className="w-3 h-3 text-[var(--erp-accent)]" />
            <span className="font-semibold text-[var(--erp-text)]">Checklist:</span>
            <span className="text-[var(--erp-text-secondary)]">{String(record.data['Linked Checklist'])}</span>
          </div>
          {record.data['Checklist Pass %'] !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-[var(--erp-text-muted)]">Pass:</span>
              <div className="w-12 h-1.5 rounded-full bg-[var(--erp-bg-hover)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Number(record.data['Checklist Pass %']) || 0}%`,
                    background: Number(record.data['Checklist Pass %']) >= 90 ? '#10B981' : Number(record.data['Checklist Pass %']) >= 70 ? '#F59E0B' : '#EF4444',
                  }}
                />
              </div>
              <span className="font-mono font-semibold text-[var(--erp-text)]">{Number(record.data['Checklist Pass %']) || 0}%</span>
            </div>
          )}
        </div>
      )}

      {/* On Hold dialog */}
      {showHoldDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-card)] p-4 max-w-md w-full space-y-3">
            <div className="flex items-center gap-2">
              <Pause className="w-4 h-4 text-[#A855F7]" />
              <h3 className="text-[13px] font-semibold text-[var(--erp-text)]">Put Work Order On Hold</h3>
            </div>
            <p className="text-[11px] text-[var(--erp-text-muted)]">
              Please provide a reason for putting this work order on hold. This will be recorded in the audit trail.
            </p>
            <textarea
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="e.g. Waiting for spare parts delivery, expected 2 days..."
              className="w-full h-20 text-[12px] p-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] focus:outline-none focus:border-[var(--erp-accent)] resize-y"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowHoldDialog(false); setHoldReason(''); }}
                className="px-3 py-1.5 rounded-md text-[11px] border border-[var(--erp-border)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={() => transitionTo('On Hold')}
                disabled={!holdReason.trim() || transitioning}
                className="px-3 py-1.5 rounded-md text-[11px] bg-[#A855F7] text-white hover:bg-[#9333EA] disabled:opacity-50"
              >
                {transitioning ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Put On Hold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WOStageWorkflow;
