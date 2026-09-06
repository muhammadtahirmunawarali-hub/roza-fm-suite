// FMCore ERP — Uploads API
// POST   /api/erp/uploads          → upload an image/file, returns { url, filename, size, mimeType }
// DELETE /api/erp/uploads?filename → remove an uploaded file
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/erp/auth';
import { writeFile, mkdir, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'image/heic', 'image/heif',
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: `File too large (max ${Math.round(MAX_SIZE / 1024 / 1024)} MB)` }, { status: 413 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ ok: false, error: `File type "${file.type}" not allowed. Allowed: ${ALLOWED_MIME.join(', ')}` }, { status: 415 });
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
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }
  if (user.role !== 'Super Admin' && user.role !== 'Manager') {
    return NextResponse.json({ ok: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');
  if (!filename) {
    return NextResponse.json({ ok: false, error: 'Filename parameter required' }, { status: 400 });
  }

  // Prevent path traversal
  const safeName = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return NextResponse.json({ ok: false, error: 'Invalid file path' }, { status: 400 });
  }

  try {
    await stat(filePath);
    await unlink(filePath);
    return NextResponse.json({ ok: true, message: `Deleted ${safeName}` });
  } catch {
    return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
  }
}
