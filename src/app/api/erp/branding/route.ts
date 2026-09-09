import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, forbidden, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser, hasPermission } from '@/lib/erp/auth';

export const GET = apiHandler(async (req: NextRequest) => {
  const settings = await db.setting.findMany({ where: { category: 'branding' } });
  const branding: Record<string, string> = {};
  settings.forEach((s) => { branding[s.key] = s.value; });
  const defaults = {
    'branding.app_name': 'FMCore ERP', 'branding.tagline': 'Facility Management Suite',
    'branding.primary_color': '#00D4AA', 'branding.accent_color': '#8B5CF6',
    'branding.logo_url': '/icon.svg', 'branding.footer_text': 'FMCore ERP v1.0.0',
  };
  return NextResponse.json({ ok: true, branding: { ...defaults, ...branding } });
});

export const PUT = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (!hasPermission(user, 'settings', 'edit')) return forbidden('No permission to update branding');
  const body = await req.json();
  const { branding } = body;
  if (!branding) return NextResponse.json({ ok: false, error: 'branding object required' }, { status: 400 });
  for (const [key, value] of Object.entries(branding)) {
    await db.setting.upsert({ where: { key }, update: { value: String(value), category: 'branding' }, create: { key, value: String(value), category: 'branding' } });
  }
  return NextResponse.json({ ok: true, count: Object.keys(branding).length });
});
