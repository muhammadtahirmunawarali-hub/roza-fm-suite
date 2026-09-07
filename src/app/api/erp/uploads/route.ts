// FMCore ERP — Uploads API
// POST   /api/erp/uploads          → upload an image/file, returns { url, filename, size, mimeType }
// GET    /api/erp/uploads          → list all uploaded files (Super Admin / Manager only)
// DELETE /api/erp/uploads?filename → remove an uploaded file
// DELETE /api/erp/uploads?cleanup=orphans → remove uploads not referenced in any record
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';
import { writeFile, mkdir, unlink, stat, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { apiHandler, badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/erp/api-helpers';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'image/heic', 'image/heif',
];

// POST — upload a file
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return badRequest('No file provided');
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { ok: false, error: `File too large (max ${Math.round(MAX_SIZE / 1024 / 1024)} MB)` },
      { status: 413 },
    );
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: `File type "${file.type}" not allowed. Allowed: ${ALLOWED_MIME.join(', ')}` },
      { status: 415 },
    );
  }

  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  // Generate a safe, unique filename preserving the original extension
  const ext = path.extname(file.name) || (file.type === 'image/jpeg' ? '.jpg' : file.type.split('/')[1] ? `.${file.type.split('/')[1]}` : '');
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 8);
  const filename = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${randomUUID().slice(0, 8)}${safeExt}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const url = `/uploads/${filename}`;
  return NextResponse.json({
    ok: true,
    url,
    filename,
    originalName: file.name,
    size: file.size,
    mimeType: file.type,
  });
});

// GET — list all uploaded files with their reference status
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin' && user.role !== 'Manager') {
    return forbidden('Insufficient permissions');
  }

  if (!existsSync(UPLOAD_DIR)) {
    return NextResponse.json({ ok: true, files: [], totalSize: 0 });
  }

  const entries = await readdir(UPLOAD_DIR);
  const files = await Promise.all(
    entries.map(async (name) => {
      try {
        const filePath = path.join(UPLOAD_DIR, name);
        const s = await stat(filePath);
        return {
          filename: name,
          url: `/uploads/${name}`,
          size: s.size,
          createdAt: s.birthtime.toISOString(),
          modifiedAt: s.mtime.toISOString(),
        };
      } catch {
        return null;
      }
    }),
  );

  const validFiles = files.filter(Boolean) as {
    filename: string;
    url: string;
    size: number;
    createdAt: string;
    modifiedAt: string;
  }[];

  // Sort by creation date, newest first
  validFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0);
  return NextResponse.json({
    ok: true,
    files: validFiles,
    count: validFiles.length,
    totalSize,
    totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
  });
});

// DELETE — remove a single file OR clean up orphaned uploads
export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  if (user.role !== 'Super Admin' && user.role !== 'Manager') {
    return forbidden('Insufficient permissions');
  }

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');
  const cleanup = searchParams.get('cleanup');

  // --- Cleanup mode: remove orphaned uploads (not referenced in any record) ---
  if (cleanup === 'orphans') {
    if (!existsSync(UPLOAD_DIR)) {
      return NextResponse.json({ ok: true, deleted: [], count: 0 });
    }

    // Collect all upload URLs referenced in records
    const allRecords = await db.record.findMany({
      where: { isDeleted: false },
      select: { data: true },
    });

    const referencedUrls = new Set<string>();
    allRecords.forEach((r) => {
      try {
        const data = JSON.parse(r.data);
        Object.values(data).forEach((v) => {
          if (typeof v === 'string' && v.startsWith('/uploads/')) {
            referencedUrls.add(v.replace('/uploads/', ''));
          }
        });
      } catch {}
    });

    const entries = await readdir(UPLOAD_DIR);
    const deleted: string[] = [];
    let freedBytes = 0;

    for (const name of entries) {
      if (referencedUrls.has(name)) continue; // Still in use — skip
      try {
        const filePath = path.join(UPLOAD_DIR, name);
        const s = await stat(filePath);
        await unlink(filePath);
        deleted.push(name);
        freedBytes += s.size;
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      deleted,
      count: deleted.length,
      freedBytes,
      freedMB: Math.round((freedBytes / 1024 / 1024) * 100) / 100,
      totalScanned: entries.length,
      referenced: referencedUrls.size,
    });
  }

  // --- Single-file delete mode ---
  if (!filename) {
    return badRequest('Filename parameter required (or use ?cleanup=orphans)');
  }

  // Prevent path traversal
  const safeName = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return badRequest('Invalid file path');
  }

  try {
    await stat(filePath);
    await unlink(filePath);
    return NextResponse.json({ ok: true, message: `Deleted ${safeName}` });
  } catch {
    return notFound('File not found');
  }
});
