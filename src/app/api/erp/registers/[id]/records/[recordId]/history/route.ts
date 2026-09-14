// Roza FM Suite — Record history (audit log entries for a specific record)
// GET /api/erp/registers/[id]/records/[recordId]/history
// Returns all audit log entries for this record, sorted by date descending.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;

  const logs = await db.auditLog.findMany({
    where: {
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

    // Detect status change
    let statusChange: { from: string; to: string } | null = null;
    if (oldData && newData) {
      const register = db.register.findUnique({ where: { id } });
      // We can't await inside map, so just check for 'Status' field changes
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
