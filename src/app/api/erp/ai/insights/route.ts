// Roza FM Suite — AI Predictive Insights API
// GET /api/erp/ai/insights → returns predictive analytics (overdue predictions, stock-out alerts)
// TENANT ISOLATION: every record.findMany is scoped via tenantWhere(user).
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere } from '@/lib/erp/tenant';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();

  const insights: any[] = [];

  // 1. Predict overdue work orders (WOs that are likely to become overdue based on history)
  const woRecords = await db.record.findMany({
    where: { ...tenantWhere(user), isDeleted: false, register: { code: 'workorders' } },
    orderBy: { sequence: 'asc' },
  });

  const openWOs = woRecords.filter((r) => {
    const data = JSON.parse(r.data);
    return data['Status'] === 'Open' || data['Status'] === 'In Progress';
  });

  openWOs.forEach((wo) => {
    const data = JSON.parse(wo.data);
    const priority = data['Priority'] || 'Medium';
    const daysOpen = Math.floor((Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    let riskScore = 0;
    let prediction = '';

    if (priority === 'Critical') {
      riskScore = 90;
      prediction = 'Critical priority — likely overdue';
    } else if (priority === 'High') {
      riskScore = 70;
      prediction = 'High priority — may become overdue';
    } else if (daysOpen > 7) {
      riskScore = 60;
      prediction = `Open for ${daysOpen} days — becoming stale`;
    } else if (daysOpen > 3) {
      riskScore = 40;
      prediction = `Open for ${daysOpen} days — monitor`;
    }

    if (riskScore > 0) {
      insights.push({
        type: 'wo_overdue_risk',
        registerId: wo.registerId,
        recordId: wo.id,
        sequence: wo.sequence,
        label: data['Fault Description']?.slice(0, 60) || `WO #${wo.sequence}`,
        priority,
        daysOpen,
        riskScore,
        prediction,
        recommendation: riskScore > 70 ? 'Assign immediately or escalate' : 'Monitor closely',
      });
    }
  });

  // 2. Predict stock-out alerts
  const invRecords = await db.record.findMany({
    where: { ...tenantWhere(user), isDeleted: false, register: { code: 'inventory' } },
  });

  invRecords.forEach((item) => {
    const data = JSON.parse(item.data);
    const currentStock = Number(data['Current Stock'] || data['Quantity'] || 0);
    const minStock = Number(data['Minimum Level'] || data['Min Level'] || 0);

    if (currentStock <= minStock && minStock > 0) {
      const riskScore = currentStock === 0 ? 100 : Math.round((1 - currentStock / minStock) * 100);
      insights.push({
        type: 'stock_out_risk',
        registerId: item.registerId,
        recordId: item.id,
        sequence: item.sequence,
        label: data['Item Name'] || data['Product'] || `Item #${item.sequence}`,
        currentStock,
        minStock,
        riskScore,
        prediction: currentStock === 0 ? 'OUT OF STOCK' : `Below minimum (${currentStock}/${minStock})`,
        recommendation: 'Reorder immediately',
      });
    }
  });

  // 3. PM due predictions
  const pmRecords = await db.record.findMany({
    where: { ...tenantWhere(user), isDeleted: false, register: { code: 'pm' } },
  });

  pmRecords.forEach((pm) => {
    const data = JSON.parse(pm.data);
    const nextDue = data['Next Due'];
    if (!nextDue) return;

    const dueDate = new Date(nextDue);
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 7) {
      insights.push({
        type: 'pm_due_soon',
        registerId: pm.registerId,
        recordId: pm.id,
        sequence: pm.sequence,
        label: data['Equipment'] || `PM #${pm.sequence}`,
        nextDue,
        daysUntilDue,
        riskScore: daysUntilDue <= 0 ? 100 : daysUntilDue <= 3 ? 80 : 50,
        prediction: daysUntilDue <= 0 ? 'OVERDUE' : `Due in ${daysUntilDue} days`,
        recommendation: daysUntilDue <= 0 ? 'Schedule immediately' : 'Schedule soon',
      });
    }
  });

  // Sort by risk score (highest first)
  insights.sort((a, b) => b.riskScore - a.riskScore);

  return NextResponse.json({
    ok: true,
    insights,
    count: insights.length,
    generatedAt: new Date().toISOString(),
  });
});
