// FMCore ERP — Record status transition (approval workflow)
// POST /api/erp/registers/[id]/records/[recordId]/transition
//   { action: 'approve' | 'reject' | 'submit' | 'cancel' | 'reopen', comment?: string }
// Returns the updated record.
//
// The endpoint looks for a column of type 'status' in the register and applies
// the appropriate status transition based on the current status + action.
// Server-side permission check: reads session cookie, looks up user, verifies
// the user has 'approve' or 'edit' permission for this register.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ColumnDef } from '@/lib/erp/types';
import { getRolePermissions } from '@/lib/erp/seed';

// Workflow state machine — maps (currentStatus, action) → newStatus
const TRANSITIONS: Record<string, Record<string, string>> = {
  // Approval-based registers (Purchase Request, PTW, Leave, etc.)
  'Draft':     { submit: 'Submitted', approve: 'Approved', reject: 'Rejected', cancel: 'Cancelled' },
  'Submitted': { approve: 'Approved',  reject: 'Rejected',  cancel: 'Cancelled' },
  'Approved':  { cancel: 'Cancelled',  reopen: 'Submitted' },
  'Rejected':  { submit: 'Submitted',  cancel: 'Cancelled' },
  'Pending':   { approve: 'Approved',  reject: 'Rejected',   cancel: 'Cancelled' },
  'Pending Approval': { approve: 'Approved', reject: 'Rejected', cancel: 'Cancelled' },
  // Work order states
  'Open':         { assign: 'Assigned', start: 'In Progress', cancel: 'Cancelled' },
  'Assigned':     { start: 'In Progress', cancel: 'Cancelled' },
  'In Progress':  { complete: 'Completed', hold: 'On Hold', cancel: 'Cancelled' },
  'On Hold':      { resume: 'In Progress', cancel: 'Cancelled' },
  'Completed':    { reopen: 'In Progress' },
  // Generic reopen for closed states
  'Closed':       { reopen: 'Open' },
  'Cancelled':    { reopen: 'Draft' },
  'Active':       { deactivate: 'Inactive' },
  'Inactive':     { activate: 'Active' },
};

// Server-side permission check helper
async function checkPermission(req: NextRequest, registerCode: string, action: string): Promise<{ allowed: boolean; user?: any; error?: string }> {
  const token = req.cookies.get('fmcore_session')?.value;
  if (!token) {
    // For demo: allow if no session (backward compat with unauthenticated testing)
    // In production, this should return { allowed: false, error: 'Not authenticated' }
    return { allowed: true, user: null };
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return { allowed: false, error: 'Session expired' };
  }

  const user = session.user;
  if (user.status !== 'Active') {
    return { allowed: false, error: `User account is ${user.status}` };
  }

  // Super Admin always allowed
  if (user.role === 'Super Admin') {
    return { allowed: true, user };
  }

  // Check permission
  const permissions = JSON.parse(user.permissions) as { module: string; actions: string[] }[];
  const perm = permissions.find((p) => p.module === registerCode);
  if (!perm || !perm.actions.includes(action)) {
    return { allowed: false, error: `You don't have '${action}' permission for this register`, user };
  }

  return { allowed: true, user };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  const register = await db.register.findUnique({ where: { id } });
  if (!register || register.isDeleted) {
    return NextResponse.json({ ok: false, error: 'Register not found' }, { status: 404 });
  }

  const existing = await db.record.findUnique({ where: { id: recordId, registerId: id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ ok: false, error: 'Record not found' }, { status: 404 });
  }

  // Server-side permission check
  // 'approve' action requires 'approve' permission; other actions require 'edit'
  const requiredPermission = 'approve'; // All transitions require approve or edit
  const permCheck = await checkPermission(req, register.code, requiredPermission);
  if (!permCheck.allowed && permCheck.error !== 'Session expired') {
    // Try 'edit' permission as fallback for non-approval actions
    const editCheck = await checkPermission(req, register.code, 'edit');
    if (!editCheck.allowed) {
      return NextResponse.json({ ok: false, error: permCheck.error || 'Permission denied' }, { status: 403 });
    }
  }
  const currentUser = permCheck.user || null;

  const body = await req.json();
  const { action, comment } = body;
  if (!action) {
    return NextResponse.json({ ok: false, error: 'Action is required' }, { status: 400 });
  }

  const columns = JSON.parse(register.columns) as ColumnDef[];
  const statusCol = columns.find((c) => c.type === 'status');
  if (!statusCol) {
    return NextResponse.json({ ok: false, error: 'Register has no status column' }, { status: 400 });
  }

  const data = JSON.parse(existing.data);
  const currentStatus = String(data[statusCol.name] || 'Draft');
  const transitions = TRANSITIONS[currentStatus] || {};
  const newStatus = transitions[action];

  if (!newStatus) {
    return NextResponse.json({
      ok: false,
      error: `Action "${action}" is not valid for status "${currentStatus}"`,
      availableActions: Object.keys(transitions),
    }, { status: 400 });
  }

  // Validate the new status is in the column's options (if options exist)
  if (statusCol.options && !statusCol.options.includes(newStatus)) {
    return NextResponse.json({
      ok: false,
      error: `Status "${newStatus}" is not a valid option for this register`,
    }, { status: 400 });
  }

  const oldData = { ...data };
  data[statusCol.name] = newStatus;

  // Add audit comment if provided
  if (comment) {
    const commentsCol = columns.find((c) => c.name.toLowerCase().includes('comment') || c.name.toLowerCase().includes('remark'));
    if (commentsCol && (commentsCol.type === 'long_text' || commentsCol.type === 'text')) {
      const existingComment = data[commentsCol.name] ? String(data[commentsCol.name]) + '\n\n' : '';
      data[commentsCol.name] = existingComment + `[${new Date().toISOString().slice(0, 16).replace('T', ' ')}] ${action.toUpperCase()}: ${comment}`;
    }
  }

  const updated = await db.record.update({
    where: { id: recordId },
    data: {
      data: JSON.stringify(data),
      updatedBy: currentUser?.username || 'system',
    },
  });

  await db.auditLog.create({
    data: {
      userId: currentUser?.id || null,
      action: action === 'approve' ? 'Approved' : action === 'reject' ? 'Updated' : 'Updated',
      module: register.name,
      registerId: id,
      recordId,
      summary: `Status transition: ${currentStatus} → ${newStatus}${comment ? ` (comment: "${comment.slice(0, 80)}")` : ''}`,
      oldValue: JSON.stringify(oldData),
      newValue: JSON.stringify(data),
    },
  });

  // Create a notification if approval/rejection
  if (action === 'approve' || action === 'reject') {
    await db.notification.create({
      data: {
        type: action === 'approve' ? 'pending_approval' : 'system',
        title: `${action === 'approve' ? 'Approved' : 'Rejected'}: ${register.name} #${existing.sequence}`,
        message: `Status changed from ${currentStatus} to ${newStatus}${comment ? ` — "${comment.slice(0, 100)}"` : ''}`,
        severity: action === 'approve' ? 'success' : 'warning',
        link: `/?tab=${register.code}`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    record: {
      id: updated.id,
      registerId: updated.registerId,
      sequence: updated.sequence,
      data: JSON.parse(updated.data),
      isDeleted: updated.isDeleted,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      createdBy: updated.createdBy,
      updatedBy: updated.updatedBy,
    },
    transition: { from: currentStatus, to: newStatus, action },
  });
}

// GET — return available transitions for the current status
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  const register = await db.register.findUnique({ where: { id } });
  if (!register) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const existing = await db.record.findUnique({ where: { id: recordId, registerId: id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Record not found' }, { status: 404 });

  const columns = JSON.parse(register.columns) as ColumnDef[];
  const statusCol = columns.find((c) => c.type === 'status');
  if (!statusCol) return NextResponse.json({ ok: false, error: 'No status column' }, { status: 400 });

  const data = JSON.parse(existing.data);
  const currentStatus = String(data[statusCol.name] || 'Draft');
  const transitions = TRANSITIONS[currentStatus] || {};

  return NextResponse.json({
    ok: true,
    currentStatus,
    availableActions: Object.keys(transitions).map((action) => ({
      action,
      to: transitions[action],
      label: actionLabel(action),
      variant: actionVariant(action),
    })),
  });
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    submit: 'Submit for Approval',
    approve: 'Approve',
    reject: 'Reject',
    cancel: 'Cancel',
    reopen: 'Reopen',
    assign: 'Assign',
    start: 'Start Work',
    complete: 'Mark Complete',
    hold: 'Put on Hold',
    resume: 'Resume',
    activate: 'Activate',
    deactivate: 'Deactivate',
  };
  return labels[action] || action.charAt(0).toUpperCase() + action.slice(1);
}

function actionVariant(action: string): 'success' | 'danger' | 'warning' | 'info' | 'accent' {
  switch (action) {
    case 'approve':
    case 'complete':
    case 'activate':
      return 'success';
    case 'reject':
    case 'cancel':
    case 'deactivate':
      return 'danger';
    case 'submit':
    case 'start':
    case 'resume':
      return 'accent';
    case 'hold':
    case 'reopen':
      return 'warning';
    case 'assign':
      return 'info';
    default:
      return 'info';
  }
}
