import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, badRequest, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { createCheckoutSession, BILLING_PLANS, type PlanId } from '@/lib/erp/billing';

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  const body = await req.json();
  const { planId, successUrl, cancelUrl } = body;
  if (!planId || !BILLING_PLANS[planId as PlanId]) return badRequest('Invalid planId');
  if (!successUrl || !cancelUrl) return badRequest('successUrl and cancelUrl are required');
  const session = await createCheckoutSession('default', planId as PlanId, successUrl, cancelUrl);
  return NextResponse.json(session);
});
