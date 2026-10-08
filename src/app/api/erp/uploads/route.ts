// Roza FM Suite — Uploads API (Backblaze B2 + Cloudflare R2 + Local fallback)
// POST   /api/erp/uploads          → upload an image/file, returns { url, key, filename, size, mimeType, provider }
// GET    /api/erp/uploads          → list all uploaded files for the current tenant
// DELETE /api/erp/uploads?key=     → remove a single file by storage key
// DELETE /api/erp/uploads?cleanup=orphans → remove unreferenced uploads
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere } from '@/lib/erp/tenant';
import {
  uploadFile,
  deleteFile,
  listFiles,
  cleanupOrphanedFiles,
  getStorageInfo,
  getStorageUsage,
} from '@/lib/erp/storage';
import { apiHandler, badRequest, forbidden, notFound, unauthorized } from '@/lib/erp/api-helpers';

// POST — upload a file
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return badRequest('No file provided');
  }

  // Storage quota check
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
    if (tenant) {
      const usage = await getStorageUsage(user.tenantId);
      const maxBytes = (tenant.maxStorageMb || 1024) * 1024 * 1024;
      if (usage.bytes + file.size > maxBytes) {
        return NextResponse.json({
          ok: false,
          error: `Storage limit exceeded. Using ${Math.round(usage.bytes / 1024 / 1024 * 100) / 100} MB of ${tenant.maxStorageMb} MB.`,
        }, { status: 413 });
      }
    }
  }

  const bytes = await file.arrayBuffer();
  const result = await uploadFile({
    buffer: Buffer.from(bytes),
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    tenantId: user.tenantId,
  });

  if (!result.ok) {
    if (result.error?.includes('too large')) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 413 });
    }
    if (result.error?.includes('not allowed')) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 415 });
    }
    return NextResponse.json({ ok: false, error: result.error || 'Upload failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    url: result.url,
    key: result.key,
    filename: result.filename,
    originalName: result.originalName,
    size: result.size,
    mimeType: result.mimeType,
    provider: result.provider,
  });
});

// GET — list all uploaded files for the current tenant
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin' && user.role !== 'Manager' && user.role !== 'Administrator') {
    return forbidden('Insufficient permissions');
  }

  const files = await listFiles(user.tenantId);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const info = getStorageInfo();

  return NextResponse.json({
    ok: true,
    files,
    count: files.length,
    totalSize,
    totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
    provider: info.provider,
    configured: info.configured,
  });
});

// DELETE — remove a single file OR clean up orphaned uploads
export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin' && user.role !== 'Manager' && user.role !== 'Administrator') {
    return forbidden('Insufficient permissions');
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key') || searchParams.get('filename');
  const cleanup = searchParams.get('cleanup');

  // Cleanup mode
  if (cleanup === 'orphans') {
    const allRecords = await db.record.findMany({
      where: { ...tenantWhere(user), isDeleted: false },
      select: { data: true },
    });
    const referencedUrls = new Set<string>();
    allRecords.forEach((r) => {
      try {
        const data = JSON.parse(r.data);
        Object.values(data).forEach((v) => {
          if (typeof v === 'string' && (v.startsWith('/uploads/') || v.startsWith('http'))) {
            referencedUrls.add(v);
            const parts = v.split('/');
            if (parts.length >= 2) referencedUrls.add(parts[parts.length - 1]);
          }
          if (Array.isArray(v)) {
            v.forEach((item) => {
              if (typeof item === 'string' && (item.startsWith('/uploads/') || item.startsWith('http'))) {
                referencedUrls.add(item);
                const parts = item.split('/');
                if (parts.length >= 2) referencedUrls.add(parts[parts.length - 1]);
              }
            });
          }
        });
      } catch {}
    });
    const { deleted, freedBytes } = await cleanupOrphanedFiles(referencedUrls, user.tenantId);
    return NextResponse.json({ ok: true, deleted, count: deleted.length, freedBytes, freedMB: Math.round((freedBytes / 1024 / 1024) * 100) / 100, referenced: referencedUrls.size });
  }

  // Single-file delete
  if (!key) return badRequest('Key parameter required (or use ?cleanup=orphans)');
  const prefix = user.tenantId || 'platform';
  if (!key.startsWith(`${prefix}/`) && key !== prefix) {
    return forbidden('You can only delete files from your own tenant');
  }
  const ok = await deleteFile(key);
  if (!ok) return notFound('File not found');
  return NextResponse.json({ ok: true, message: `Deleted ${key}` });
});
