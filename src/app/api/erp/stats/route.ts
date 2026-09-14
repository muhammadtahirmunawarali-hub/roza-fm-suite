// Roza FM Suite — System Stats API
// GET /api/erp/stats → returns global system statistics
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const [registers, records, users, auditLogs, notifications, settings, savedViews, activeSessions, unreadNotifs, inactiveUsers, dashboardPrefs] = await Promise.all([
    db.register.count({ where: { isDeleted: false } }),
    db.record.count({ where: { isDeleted: false } }),
    db.user.count(),
    db.auditLog.count(),
    db.notification.count(),
    db.setting.count(),
    db.savedView.count(),
    db.session.count({ where: { expiresAt: { gt: new Date() } } }),
    db.notification.count({ where: { isRead: false } }),
    db.user.count({ where: { status: 'Inactive' } }),
    db.userDashboardPref.count(),
  ]);

  return NextResponse.json({
    registers,
    records,
    users,
    activeUsers: users - inactiveUsers,
    inactiveUsers,
    auditLogs,
    notifications,
    unreadNotifs,
    settings,
    savedViews,
    activeSessions,
    dashboardPrefs,
  });
}
