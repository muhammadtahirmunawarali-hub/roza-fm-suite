// Roza FM Suite — Reset endpoint (wipes everything, then re-seeds)
import { NextResponse } from 'next/server';
import { resetDatabase, seedDatabase } from '@/lib/erp/seed';

export async function POST() {
  await resetDatabase();
  const result = await seedDatabase(true);
  return NextResponse.json({ ok: true, ...result });
}
