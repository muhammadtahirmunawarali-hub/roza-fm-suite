// FMCore ERP — Stripe Webhook
// POST /api/erp/billing/webhook → handle Stripe webhook events
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // In development (no STRIPE_WEBHOOK_SECRET), just log
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('[STRIPE WEBHOOK DEV MODE] Received webhook:', body.slice(0, 500));

    try {
      const event = JSON.parse(body);
      await db.auditLog
        .create({
          data: {
            action: 'Webhook Received',
            module: 'Billing',
            summary: `Stripe webhook: ${event.type}`,
            newValue: body.slice(0, 1000),
          },
        })
        .catch(() => {});
    } catch {}

    return NextResponse.json({ received: true, devMode: true });
  }

  // Production mode — would verify signature:
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  // Then handle event.type (checkout.session.completed, customer.subscription.updated, etc.)

  // Signature verification placeholder — reject if missing when configured
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
