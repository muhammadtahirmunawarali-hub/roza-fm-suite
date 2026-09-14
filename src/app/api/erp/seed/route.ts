// Roza FM Suite — Seed endpoint (manual trigger)
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/erp/seed';

export async function POST() {
  const result = await seedDatabase(true);
  return NextResponse.json({ ok: true, ...result });
}
