import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export interface ApiKeyUser {
  keyId: string;
  keyName: string;
  permissions: string[];
}

export async function getApiKeyUser(req: NextRequest): Promise<ApiKeyUser | null> {
  const apiKey = req.headers.get('x-api-key') || new URL(req.url).searchParams.get('api_key');
  if (!apiKey) return null;
  const key = await db.apiKey.findUnique({ where: { key: apiKey, isActive: true } });
  if (!key) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { keyId: key.id, keyName: key.name, permissions: JSON.parse(key.permissions as string || '[]') };
}

export function hasApiKeyPermission(apiUser: ApiKeyUser | null, permission: string): boolean {
  if (!apiUser) return false;
  return apiUser.permissions.includes(permission) || apiUser.permissions.includes('*');
}
