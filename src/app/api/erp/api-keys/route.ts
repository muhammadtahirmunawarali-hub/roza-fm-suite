import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, badRequest, forbidden, unauthorized } from '@/lib/erp/api-helpers';
import { getCurrentUser } from '@/lib/erp/auth';
import { randomBytes } from 'crypto';

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin' && user.role !== 'Administrator' && user.role !== 'Manager') return forbidden('Insufficient permissions');
  const keys = await db.apiKey.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(keys.map(k => ({ id: k.id, name: k.name, key: k.key.slice(0, 8) + '...' + k.key.slice(-4), permissions: JSON.parse(k.permissions as string || '[]'), rateLimit: k.rateLimit, lastUsedAt: k.lastUsedAt?.toISOString() || null, isActive: k.isActive, createdAt: k.createdAt.toISOString() })));
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin' && user.role !== 'Administrator') return forbidden('Only admins can create API keys');
  const body = await req.json();
  const { name, permissions = ['read'] } = body;
  if (!name) return badRequest('Name is required');
  const key = randomBytes(24).toString('hex');
  const apiKey = await db.apiKey.create({ data: { key, name, permissions: JSON.stringify(permissions) } });
  return NextResponse.json({ id: apiKey.id, name: apiKey.name, key, permissions, createdAt: apiKey.createdAt.toISOString() });
});
