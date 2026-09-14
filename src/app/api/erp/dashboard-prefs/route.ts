// FMCore ERP — Dashboard Preferences API
// GET  /api/erp/dashboard-prefs           → get current user's dashboard preferences
// POST /api/erp/dashboard-prefs           → save dashboard preferences
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface Prefs {
  pinnedKpis?: string[];
  hiddenKpis?: string[];
  kpiOrder?: string[];
  pinnedCharts?: string[];
  hiddenCharts?: string[];
  chartOrder?: string[];
}

async function getCurrentUser(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('fmcore_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user.id;
}

export async function GET(req: NextRequest) {
  // Note: seedDatabase is NOT called here — it's called on /api/erp/auth/me (app startup)
  const userId = await getCurrentUser(req);

  if (!userId) {
    // Return defaults for unauthenticated users
    return NextResponse.json({
      pinnedKpis: [],
      hiddenKpis: [],
      kpiOrder: [],
      pinnedCharts: [],
      hiddenCharts: [],
      chartOrder: [],
    });
  }

  const pref = await db.userDashboardPref.findUnique({ where: { userId } });

  if (!pref) {
    return NextResponse.json({
      pinnedKpis: [],
      hiddenKpis: [],
      kpiOrder: [],
      pinnedCharts: [],
      hiddenCharts: [],
      chartOrder: [],
    });
  }

  return NextResponse.json({
    pinnedKpis: JSON.parse(pref.pinnedKpis),
    hiddenKpis: JSON.parse(pref.hiddenKpis),
    kpiOrder: JSON.parse(pref.kpiOrder),
    pinnedCharts: JSON.parse(pref.pinnedCharts),
    hiddenCharts: JSON.parse(pref.hiddenCharts),
    chartOrder: JSON.parse(pref.chartOrder),
  });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUser(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const body: Prefs = await req.json();
  const data = {
    userId,
    pinnedKpis: JSON.stringify(body.pinnedKpis || []),
    hiddenKpis: JSON.stringify(body.hiddenKpis || []),
    kpiOrder: JSON.stringify(body.kpiOrder || []),
    pinnedCharts: JSON.stringify(body.pinnedCharts || []),
    hiddenCharts: JSON.stringify(body.hiddenCharts || []),
    chartOrder: JSON.stringify(body.chartOrder || []),
  };

  const pref = await db.userDashboardPref.upsert({
    where: { userId },
    update: data,
    create: data,
  });

  return NextResponse.json({
    ok: true,
    pinnedKpis: JSON.parse(pref.pinnedKpis),
    hiddenKpis: JSON.parse(pref.hiddenKpis),
    kpiOrder: JSON.parse(pref.kpiOrder),
    pinnedCharts: JSON.parse(pref.pinnedCharts),
    hiddenCharts: JSON.parse(pref.hiddenCharts),
    chartOrder: JSON.parse(pref.chartOrder),
  });
}
