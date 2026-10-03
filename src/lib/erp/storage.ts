// Roza FM Suite — File Storage (B2 + R2 + Local)
import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { writeFile, mkdir, unlink, stat, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const USE_B2 = !!(process.env.B2_ENDPOINT && process.env.B2_APPLICATION_KEY_ID && process.env.B2_APPLICATION_KEY && process.env.B2_BUCKET_NAME);
const USE_R2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
const USE_S3 = USE_B2 || USE_R2;
const PROVIDER: 'b2' | 'r2' | 'local' = USE_B2 ? 'b2' : USE_R2 ? 'r2' : 'local';
const S3_PUBLIC_URL = USE_B2 ? (process.env.B2_PUBLIC_URL || '') : (process.env.R2_PUBLIC_URL || '');
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const LOCAL_PUBLIC_BASE = '/uploads';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'image/heic', 'image/heif'];

export interface UploadResult { ok: boolean; url: string; key: string; filename: string; originalName: string; size: number; mimeType: string; provider: 'b2' | 'r2' | 'local'; error?: string; }
export interface StorageFile { key: string; url: string; filename: string; size: number; createdAt: string; modifiedAt: string; }
export interface StorageUsage { bytes: number; fileCount: number; mb: number; }

let _s3: S3Client | null = null;
function getS3Client(): S3Client {
  if (!_s3) {
    if (USE_B2) {
      _s3 = new S3Client({ region: 'us-east-1', endpoint: process.env.B2_ENDPOINT, credentials: { accessKeyId: process.env.B2_APPLICATION_KEY_ID!, secretAccessKey: process.env.B2_APPLICATION_KEY! } });
    } else {
      _s3 = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
    }
  }
  return _s3;
}
function getBucketName(): string { return USE_B2 ? process.env.B2_BUCKET_NAME! : process.env.R2_BUCKET_NAME!; }

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
      await getS3Client().send(new PutObjectCommand({ Bucket: getBucketName(), Key: key, Body: buffer, ContentType: mimeType, CacheControl: 'public, max-age=31536000, immutable' }));
      return { ok: true, url: keyToUrl(key), key, filename, originalName, size, mimeType, provider: PROVIDER };
    } catch (e: any) {
      console.error(`[storage] ${PROVIDER} upload failed:`, e?.message);
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
  try { const fp = path.join(LOCAL_UPLOAD_DIR, path.dirname(key), path.basename(key)); if (!fp.startsWith(LOCAL_UPLOAD_DIR)) return false; await unlink(fp); return true; } catch { return false; }
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
      const all: StorageFile[] = []; let ct: string | undefined;
      do {
        const res = await getS3Client().send(new ListObjectsV2Command({ Bucket: getBucketName(), Prefix: `${prefix}/`, ContinuationToken: ct }));
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
  for (const f of files.filter((f) => !referencedUrls.has(f.url) && !referencedUrls.has(f.key) && !referencedUrls.has(f.filename))) {
    if (await deleteFile(f.key)) { deleted.push(f.key); freedBytes += f.size; }
  }
  return { deleted, freedBytes };
}

export function getStorageInfo() { return { provider: PROVIDER, bucket: USE_B2 ? process.env.B2_BUCKET_NAME : USE_R2 ? process.env.R2_BUCKET_NAME : null, publicUrl: S3_PUBLIC_URL || null, configured: USE_S3 }; }
