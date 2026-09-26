// Roza FM Suite — Record history (audit log entries for a specific record)
// GET /api/erp/registers/[id]/records/[recordId]/history
// Returns all audit log entries for this record, sorted by date descending.
//
// TENANT ISOLATION:
//   • Audit log entries are scoped by tenant via `tenantWhere(user)` — a tenant user
//     only sees audit history for records in their own tenant.
//   • Super Admin only sees platform/system audit history (tenantId IS NULL).
//
// BUG FIX: The previous implementation had an unawaited `db.register.findUnique`
// inside a `.map()` — Promise was created but never awaited, and the result was
// never used (only the `oldData.Status` / `newData.Status` fields were inspected).
// Removed the dead call to eliminate the dangling Promise.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere } from '@/lib/erp/tenant';
import { forbidden } from '@/lib/erp/api-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  const user = await getCurrentUser(_req);
  if (!user) return forbidden('Authentication required');

  const logs = await db.auditLog.findMany({
    where: {
      ...tenantWhere(user),
      registerId: id,
      recordId,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: true },
  });

  const history = logs.map((l) => {
    const oldData = l.oldValue ? JSON.parse(l.oldValue) : null;
    const newData = l.newValue ? JSON.parse(l.newValue) : null;

    // Detect status change — inspect the old/new payloads directly (no DB call needed).
    let statusChange: { from: string; to: string } | null = null;
    if (oldData && newData) {
      const oldStatus = oldData.Status || oldData.status;
      const newStatus = newData.Status || newData.status;
      if (oldStatus && newStatus && oldStatus !== newStatus) {
        statusChange = { from: oldStatus, to: newStatus };
      }
    }

    return {
      id: l.id,
      action: l.action,
      summary: l.summary,
      userName: l.user?.name || 'System',
      userAvatar: l.user?.avatar || (l.user?.name?.charAt(0) || 'S'),
      userRole: l.user?.role || null,
      statusChange,
      createdAt: l.createdAt.toISOString(),
      oldValue: oldData,
      newValue: newData,
    };
  });

  return NextResponse.json({ ok: true, history });
}
