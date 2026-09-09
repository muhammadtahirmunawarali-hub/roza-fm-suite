import { db } from '@/lib/db';

export const BILLING_PLANS = {
  starter: { name: 'Starter', price: 49, currency: 'usd', maxUsers: 10, maxRecords: 10000, features: ['35 registers', '14 KPIs', 'AI Assistant (100 req/mo)'] },
  pro: { name: 'Professional', price: 149, currency: 'usd', maxUsers: 50, maxRecords: 100000, features: ['Everything in Starter', 'Unlimited registers', 'White-label', 'Public API'] },
  enterprise: { name: 'Enterprise', price: 499, currency: 'usd', maxUsers: 500, maxRecords: 1000000, features: ['Everything in Pro', 'SSO/SAML', 'Dedicated support', 'SLA 99.9%'] },
} as const;

export type PlanId = keyof typeof BILLING_PLANS;

export async function createCheckoutSession(tenantId: string, planId: PlanId, successUrl: string, cancelUrl: string) {
  const plan = BILLING_PLANS[planId];
  if (!plan) throw new Error(`Invalid plan: ${planId}`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('[STRIPE DEV] Checkout:', { tenantId, plan: planId, amount: plan.price * 100 });
    return { ok: true, sessionId: `cs_dev_${Date.now()}`, url: successUrl + '?simulated=true&plan=' + planId, devMode: true };
  }
  throw new Error('Stripe production mode not configured. Set STRIPE_SECRET_KEY.');
}

export async function changePlan(tenantId: string, newPlan: PlanId) {
  const plan = BILLING_PLANS[newPlan];
  if (!plan) throw new Error(`Invalid plan: ${newPlan}`);
  return db.tenant.update({ where: { id: tenantId }, data: { plan: newPlan, maxUsers: plan.maxUsers, maxRecords: plan.maxRecords } });
}
