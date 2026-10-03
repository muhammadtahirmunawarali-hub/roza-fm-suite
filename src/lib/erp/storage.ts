// Roza FM Suite — File Storage (Backblaze B2 + Cloudflare R2 + Local)
// Roza FM Suite — File Storage Abstraction (Backblaze B2 + Cloudflare R2 + Local)
//
// SUPPORTS:
//   • Backblaze B2   — set B2_* env vars (S3-compatible, cheap, 10GB free)
//   • Cloudflare R2  — set R2_* env vars (S3-compatible, no egress fees)
//   • Local filesystem — fallback when no cloud storage env vars are set (dev only)
//
// The app automatically detects which provider is configured and uses it.
// You can switch providers anytime by changing env vars — no code changes.
//
// BACKBLAZE B2 SETUP:
//   1. Create a bucket at backblaze.com → Buckets → Create a Bucket
//      - Name it, set "Files in Bucket are: Public" (for public image access)
//   2. App Keys → Add a New Application Key → capabilities: Read + Write
//      - Copy the Key ID + Application Key
//   3. In the bucket settings, find the S3 Endpoint URL (e.g. s3.us-west-004.backblazeb2.com)
//   4. Find the "Friendly URL" or use the bucket URL for public access
//      e.g. https://f000.backblazeb2.com/file/your-bucket-name
//   5. Set these env vars:
//        B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
//        B2_APPLICATION_KEY_ID=your-key-id
//        B2_APPLICATION_KEY=your-app-key
//        B2_BUCKET_NAME=your-bucket-name
//        B2_PUBLIC_URL=https://f000.backblazeb2.com/file/your-bucket-name

import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { writeFile, mkdir, unlink, stat, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const USE_B2 = !!(process.env.B2_ENDPOINT && process.env.B2_APPLICATION_KEY_ID && process.env.B2_APPLICATION_KEY && process.env.B2_BUCKET_NAME);
const USE_R2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
const USE_S3 = USE_B2 || USE_R2;
const PROVIDER = USE_B2 ? 'b2' : USE_R2 ? 'r2' : 'local' as const;
const S3_PUBLIC_URL = USE_B2 ? (process.env.B2_PUBLIC_URL || '') : (process.env.R2_PUBLIC_URL || '');
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const LOCAL_PUBLIC_BASE = '/uploads';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'image/heic', 'image/heif'];

export interface UploadResult { ok: boolean; url: string; key: string; filename: string; originalName: string; size: number; mimeType: string; provider: 'b2' | 'r2' | 'local'; error?: string; }
export interface StorageFile { key: string; url: string; filename: string; size: number; createdAt: string; modifiedAt: string; }
export interface StorageUsage { bytes: number; fileCount: number; mb: number; }
// ────────────────────────────────────────────────────────────────
// Config — detect which S3-compatible provider is configured
// ────────────────────────────────────────────────────────────────

const USE_B2 = !!(
  process.env.B2_ENDPOINT &&
  process.env.B2_APPLICATION_KEY_ID &&
  process.env.B2_APPLICATION_KEY &&
  process.env.B2_BUCKET_NAME
);

const USE_R2 = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

// B2 takes priority (the user's chosen provider), then R2, then local
const USE_S3 = USE_B2 || USE_R2;
const PROVIDER = USE_B2 ? 'b2' : USE_R2 ? 'r2' : 'local';

const S3_PUBLIC_URL = USE_B2
  ? (process.env.B2_PUBLIC_URL || '')
  : (process.env.R2_PUBLIC_URL || '');

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const LOCAL_PUBLIC_BASE = '/uploads';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'image/heic', 'image/heif',
];

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface UploadResult {
  ok: boolean;
  url: string;
  key: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  provider: 'b2' | 'r2' | 'local';
  error?: string;
}

export interface StorageFile {
  key: string;
  url: string;
  filename: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export interface StorageUsage {
  bytes: number;
  fileCount: number;
  mb: number;
}

// ────────────────────────────────────────────────────────────────
// S3 Client (lazy init — works for both B2 and R2)
// ────────────────────────────────────────────────────────────────

let _s3: S3Client | null = null;
function getS3Client(): S3Client {
  if (!_s3) {
    if (USE_B2) {
      _s3 = new S3Client({ region: 'us-east-1', endpoint: process.env.B2_ENDPOINT, credentials: { accessKeyId: process.env.B2_APPLICATION_KEY_ID!, secretAccessKey: process.env.B2_APPLICATION_KEY! } });
    } else {
      _s3 = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
      _s3 = new S3Client({
        region: 'us-east-1', // B2 ignores this but the SDK requires a value
        endpoint: process.env.B2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.B2_APPLICATION_KEY_ID!,
          secretAccessKey: process.env.B2_APPLICATION_KEY!,
        },
      });
    } else {
      // Cloudflare R2
      _s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
    }
  }
  return _s3;
}

function getBucketName(): string {
  return USE_B2 ? process.env.B2_BUCKET_NAME! : process.env.R2_BUCKET_NAME!;
}

// ────────────────────────────────────────────────────────────────
// Key helpers (tenant-prefixed for isolation)
// ────────────────────────────────────────────────────────────────

function buildKey(tenantId: string | null, originalName: string, mimeType: string): { key: string; filename: string } {
  const prefix = tenantId || 'platform';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const ext = path.extname(originalName) || (mimeType === 'image/jpeg' ? '.jpg' : mimeType.split('/')[1] ? `.${mimeType.split('/')[1]}` : '');
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 8);
  const filename = `${date}_${randomUUID().slice(0, 8)}${safeExt}`;
  return { key: `${prefix}/${filename}`, filename };
}
function keyToUrl(key: string): string {
  if (USE_S3 && S3_PUBLIC_URL) return `${S3_PUBLIC_URL}/${key}`;
  return `${LOCAL_PUBLIC_BASE}/${key}`;
}

export async function uploadFile(opts: { buffer: Buffer; originalName: string; mimeType: string; size: number; tenantId?: string | null; }): Promise<UploadResult> {
  const { buffer, originalName, mimeType, size, tenantId = null } = opts;
  if (size > MAX_FILE_SIZE) return { ok: false, url: '', key: '', filename: '', originalName, size, mimeType, provider: PROVIDER, error: `File too large (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB)` };
  if (!ALLOWED_MIME.includes(mimeType)) return { ok: false, url: '', key: '', filename: '', originalName, size, mimeType, provider: PROVIDER, error: `File type "${mimeType}" not allowed` };
  const { key, filename } = buildKey(tenantId, originalName, mimeType);
  if (USE_S3) {
    try {
      const client = getS3Client();
      await client.send(new PutObjectCommand({ Bucket: getBucketName(), Key: key, Body: buffer, ContentType: mimeType, CacheControl: 'public, max-age=31536000, immutable' }));
      return { ok: true, url: keyToUrl(key), key, filename, originalName, size, mimeType, provider: PROVIDER };
    } catch (e: any) {
      console.error(`[storage] ${PROVIDER.toUpperCase()} upload failed:`, e?.message);
      return { ok: false, url: '', key: '', filename: '', originalName, size, mimeType, provider: PROVIDER, error: `Upload failed: ${e?.message || 'Unknown error'}` };
    }
  }
  try {
    const dir = path.dirname(path.join(LOCAL_UPLOAD_DIR, key));
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(path.join(LOCAL_UPLOAD_DIR, key), buffer);
    return { ok: true, url: keyToUrl(key), key, filename, originalName, size, mimeType, provider: 'local' };
  } catch (e: any) {
    return { ok: false, url: '', key: '', filename: '', originalName, size, mimeType, provider: 'local', error: `Upload failed: ${e?.message}` };
  }
}

export async function deleteFile(key: string): Promise<boolean> {
  if (USE_S3) { try { await getS3Client().send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key })); return true; } catch { return false; } }
  try { const filePath = path.join(LOCAL_UPLOAD_DIR, path.dirname(key), path.basename(key)); if (!filePath.startsWith(LOCAL_UPLOAD_DIR)) return false; await unlink(filePath); return true; } catch { return false; }
  const key = `${prefix}/${filename}`;
  return { key, filename };
}

function keyToUrl(key: string): string {
  if (USE_S3 && S3_PUBLIC_URL) {
    return `${S3_PUBLIC_URL}/${key}`;
  }
  return `${LOCAL_PUBLIC_BASE}/${key}`;
}

// ────────────────────────────────────────────────────────────────
// UPLOAD
// ────────────────────────────────────────────────────────────────

export async function uploadFile(opts: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  tenantId?: string | null;
}): Promise<UploadResult> {
  const { buffer, originalName, mimeType, size, tenantId = null } = opts;

  if (size > MAX_FILE_SIZE) {
    return { ok: false, url: '', key: '', filename: '', originalName, size, mimeType, provider: PROVIDER, error: `File too large (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB)` };
  }
  if (!ALLOWED_MIME.includes(mimeType)) {
    return { ok: false, url: '', key: '', filename: '', originalName, size, mimeType, provider: PROVIDER, error: `File type "${mimeType}" not allowed` };
  }

  const { key, filename } = buildKey(tenantId, originalName, mimeType);

  if (USE_S3) {
    try {
      const client = getS3Client();
      await client.send(new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return { ok: true, url: keyToUrl(key), key, filename, originalName, size, mimeType, provider: PROVIDER };
    } catch (e: any) {
      console.error(`[storage] ${PROVIDER.toUpperCase()} upload failed:`, e);
      return { ok: false, url: '', key: '', filename: '', originalName, size, mimeType, provider: PROVIDER, error: `Upload failed: ${e?.message || 'Unknown error'}` };
    }
  }

  // Local fallback
  try {
    const dir = path.dirname(path.join(LOCAL_UPLOAD_DIR, key));
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    await writeFile(filePath, buffer);
    return { ok: true, url: keyToUrl(key), key, filename, originalName, size, mimeType, provider: 'local' };
  } catch (e: any) {
    console.error('[storage] Local upload failed:', e);
    return { ok: false, url: '', key: '', filename: '', originalName, size, mimeType, provider: 'local', error: `Upload failed: ${e?.message || 'Unknown error'}` };
  }
}

// ────────────────────────────────────────────────────────────────
// DELETE
// ────────────────────────────────────────────────────────────────

export async function deleteFile(key: string): Promise<boolean> {
  if (USE_S3) {
    try {
      const client = getS3Client();
      await client.send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));
      return true;
    } catch (e: any) {
      console.error(`[storage] ${PROVIDER.toUpperCase()} delete failed:`, e);
      return false;
    }
  }
  try {
    const safeKey = path.basename(key);
    const prefix = path.dirname(key);
    const filePath = path.join(LOCAL_UPLOAD_DIR, prefix, safeKey);
    if (!filePath.startsWith(LOCAL_UPLOAD_DIR)) return false;
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteMany(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  if (USE_S3) { try { await getS3Client().send(new DeleteObjectsCommand({ Bucket: getBucketName(), Delete: { Objects: keys.map((k) => ({ Key: k })) } })); return keys.length; } catch { return 0; } }
  let n = 0; for (const k of keys) { if (await deleteFile(k)) n++; } return n;
}

export async function listFiles(tenantId?: string | null): Promise<StorageFile[]> {
  const prefix = tenantId || 'platform';
  if (USE_S3) {
    try {
      const client = getS3Client(); const all: StorageFile[] = []; let ct: string | undefined;
      do {
        const res = await client.send(new ListObjectsV2Command({ Bucket: getBucketName(), Prefix: `${prefix}/`, ContinuationToken: ct }));
        for (const obj of res.Contents || []) {
          if (!obj.Key) continue;
          all.push({ key: obj.Key, url: keyToUrl(obj.Key), filename: obj.Key.split('/').pop() || obj.Key, size: obj.Size || 0, createdAt: obj.LastModified?.toISOString() || new Date().toISOString(), modifiedAt: obj.LastModified?.toISOString() || new Date().toISOString() });
        }
        ct = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (ct);
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch { return []; }
  }
  try {
    const dir = path.join(LOCAL_UPLOAD_DIR, prefix);
    if (!existsSync(dir)) return [];
    const entries = await readdir(dir); const files: StorageFile[] = [];
    for (const name of entries) {
      try { const s = await stat(path.join(dir, name)); if (!s.isFile()) continue; const key = `${prefix}/${name}`; files.push({ key, url: keyToUrl(key), filename: name, size: s.size, createdAt: s.birthtime.toISOString(), modifiedAt: s.mtime.toISOString() }); } catch {}
    }
    return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch { return []; }
}

export async function getStorageUsage(tenantId?: string | null): Promise<StorageUsage> {
  const files = await listFiles(tenantId);
  const bytes = files.reduce((s, f) => s + f.size, 0);
  return { bytes, fileCount: files.length, mb: Math.round((bytes / 1024 / 1024) * 100) / 100 };
}

export async function cleanupOrphanedFiles(referencedUrls: Set<string>, tenantId?: string | null): Promise<{ deleted: string[]; freedBytes: number }> {
  const files = await listFiles(tenantId); const deleted: string[] = []; let freedBytes = 0;
  const toDelete = files.filter((f) => !referencedUrls.has(f.url) && !referencedUrls.has(f.key) && !referencedUrls.has(f.filename));
  for (const f of toDelete) { if (await deleteFile(f.key)) { deleted.push(f.key); freedBytes += f.size; } }
  return { deleted, freedBytes };
}

export function getStorageInfo() { return { provider: PROVIDER, bucket: USE_B2 ? process.env.B2_BUCKET_NAME : USE_R2 ? process.env.R2_BUCKET_NAME : null, publicUrl: S3_PUBLIC_URL || null, configured: USE_S3 }; }
  if (USE_S3) {
    try {
      const client = getS3Client();
      await client.send(new DeleteObjectsCommand({
        Bucket: getBucketName(),
        Delete: { Objects: keys.map((k) => ({ Key: k })) },
      }));
      return keys.length;
    } catch (e: any) {
      console.error(`[storage] ${PROVIDER.toUpperCase()} bulk delete failed:`, e);
      return 0;
    }
  }
  let deleted = 0;
  for (const key of keys) {
    if (await deleteFile(key)) deleted++;
  }
  return deleted;
}

// ────────────────────────────────────────────────────────────────
// LIST (for a tenant)
// ────────────────────────────────────────────────────────────────

export async function listFiles(tenantId?: string | null): Promise<StorageFile[]> {
  const prefix = tenantId || 'platform';

  if (USE_S3) {
    try {
      const client = getS3Client();
      const all: StorageFile[] = [];
      let continuationToken: string | undefined;
      do {
        const res = await client.send(new ListObjectsV2Command({
          Bucket: getBucketName(),
          Prefix: `${prefix}/`,
          ContinuationToken: continuationToken,
        }));
        for (const obj of res.Contents || []) {
          if (!obj.Key) continue;
          all.push({
            key: obj.Key,
            url: keyToUrl(obj.Key),
            filename: obj.Key.split('/').pop() || obj.Key,
            size: obj.Size || 0,
            createdAt: obj.LastModified?.toISOString() || new Date().toISOString(),
            modifiedAt: obj.LastModified?.toISOString() || new Date().toISOString(),
          });
        }
        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (continuationToken);
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e: any) {
      console.error(`[storage] ${PROVIDER.toUpperCase()} list failed:`, e);
      return [];
    }
  }

  // Local
  try {
    const dir = path.join(LOCAL_UPLOAD_DIR, prefix);
    if (!existsSync(dir)) return [];
    const entries = await readdir(dir);
    const files: StorageFile[] = [];
    for (const name of entries) {
      try {
        const filePath = path.join(dir, name);
        const s = await stat(filePath);
        if (!s.isFile()) continue;
        const key = `${prefix}/${name}`;
        files.push({
          key,
          url: keyToUrl(key),
          filename: name,
          size: s.size,
          createdAt: s.birthtime.toISOString(),
          modifiedAt: s.mtime.toISOString(),
        });
      } catch {}
    }
    return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────────
// USAGE (total bytes + file count for a tenant)
// ────────────────────────────────────────────────────────────────

export async function getStorageUsage(tenantId?: string | null): Promise<StorageUsage> {
  const files = await listFiles(tenantId);
  const bytes = files.reduce((sum, f) => sum + f.size, 0);
  return { bytes, fileCount: files.length, mb: Math.round((bytes / 1024 / 1024) * 100) / 100 };
}

// ────────────────────────────────────────────────────────────────
// CLEANUP ORPHANS
// ────────────────────────────────────────────────────────────────

export async function cleanupOrphanedFiles(referencedUrls: Set<string>, tenantId?: string | null): Promise<{ deleted: string[]; freedBytes: number }> {
  const files = await listFiles(tenantId);
  const deleted: string[] = [];
  let freedBytes = 0;
  const toDelete = files.filter((f) => !referencedUrls.has(f.url) && !referencedUrls.has(f.key) && !referencedUrls.has(f.filename));
  for (const f of toDelete) {
    if (await deleteFile(f.key)) {
      deleted.push(f.key);
      freedBytes += f.size;
    }
  }
  return { deleted, freedBytes };
}

// ────────────────────────────────────────────────────────────────
// Public info
// ────────────────────────────────────────────────────────────────

export function getStorageInfo() {
  return {
    provider: PROVIDER as 'b2' | 'r2' | 'local',
    bucket: USE_B2 ? process.env.B2_BUCKET_NAME : USE_R2 ? process.env.R2_BUCKET_NAME : null,
    publicUrl: S3_PUBLIC_URL || null,
    configured: USE_S3,
  };
}
