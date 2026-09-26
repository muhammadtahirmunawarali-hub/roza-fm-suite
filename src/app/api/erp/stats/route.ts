// Roza FM Suite — System Stats API
// GET /api/erp/stats → returns system statistics scoped to the current tenant
// TENANT ISOLATION: registers/records/auditLogs/savedViews are scoped via tenantWhere(user).
// Users, settings, notifications, sessions, and dashboard prefs are global and left as-is
// (Notification/Setting have no tenantId column; user/session/dashboard-pref are
//  managed elsewhere).
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere } from '@/lib/erp/tenant';
import { forbidden } from '@/lib/erp/api-helpers';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');

  const [registers, records, users, auditLogs, notifications, settings, savedViews, activeSessions, unreadNotifs, inactiveUsers, dashboardPrefs] = await Promise.all([
    db.register.count({ where: { ...tenantWhere(user), isDeleted: false } }),
    db.record.count({ where: { ...tenantWhere(user), isDeleted: false } }),
    db.user.count(),
    db.auditLog.count({ where: { ...tenantWhere(user) } }),
    db.notification.count(),
    db.setting.count(),
    db.savedView.count({ where: { ...tenantWhere(user) } }),
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
