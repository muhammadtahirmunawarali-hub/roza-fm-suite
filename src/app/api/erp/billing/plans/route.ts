import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/erp/api-helpers';
import { BILLING_PLANS } from '@/lib/erp/billing';

export const GET = apiHandler(async () => {
  const plans = Object.entries(BILLING_PLANS).map(([id, plan]) => ({ id, name: plan.name, price: plan.price, currency: plan.currency, maxUsers: plan.maxUsers, maxRecords: plan.maxRecords, features: plan.features }));
  return NextResponse.json({ ok: true, plans });
});
