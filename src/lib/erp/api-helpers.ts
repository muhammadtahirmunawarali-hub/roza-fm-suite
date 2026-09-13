// FMCore ERP — API Helpers
// Reusable utilities for API route handlers: error wrapping, validation, responses.
import { NextResponse } from 'next/server';
import { getCurrentUser, hasPermission, type AuthUser } from './auth';

// ---------- Standardized error responses ----------
export function badRequest(error: string, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status: 400 });
}

export function unauthorized(error: string = 'Authentication required') {
  return NextResponse.json({ ok: false, error }, { status: 401 });
}

export function forbidden(error: string = 'Insufficient permissions') {
  return NextResponse.json({ ok: false, error }, { status: 403 });
}

export function notFound(error: string = 'Not found') {
  return NextResponse.json({ ok: false, error }, { status: 404 });
}

export function conflict(error: string, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status: 409 });
}

export function unprocessableEntity(error: string, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status: 422 });
}

export function tooManyRequests(error: string = 'Too many requests') {
  return NextResponse.json({ ok: false, error }, { status: 429 });
}

export function serverError(error: string = 'Internal server error', details?: any) {
  // Don't leak internal details in production
  const isDev = process.env.NODE_ENV === 'development';
  return NextResponse.json(
    { ok: false, error, details: isDev ? details : undefined },
    { status: 500 },
  );
}

// ---------- API Handler wrapper (try/catch + logging) ----------
// Wraps an async route handler so any thrown error becomes a clean 500 response
// instead of crashing the dev server or returning an unhandled rejection.
// Uses `any` for req/ctx so both NextRequest and standard Request work.
type HandlerFn = (req: any, ctx: any) => Promise<any>;

export function apiHandler(handler: HandlerFn): HandlerFn {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e: any) {
      console.error('[API Error]', {
        url: new URL(req.url).pathname,
        method: req.method,
        error: e?.message,
        stack: e?.stack?.split('\n').slice(0, 3),
      });
      const msg = e?.message || 'Unknown server error';
      return serverError('Internal server error', { message: msg });
    }
  };
}

// ---------- Auth helpers for API routes ----------
// Require authentication — returns user or 401 response tuple.
// Usage: const [user, error] = await requireAuth(req); if (error) return error;
export async function requireAuth(req: Request): Promise<[AuthUser | null, Response | null]> {
  const user = await getCurrentUser(req as any);
  if (!user) {
    return [null, unauthorized()];
  }
  return [user, null];
}

// Require a specific permission on a module. Returns [user, errorResponse].
// If errorResponse is non-null, return it immediately from the route.
export async function requirePermission(
  req: Request,
  module: string,
  action: string,
): Promise<[AuthUser | null, Response | null]> {
  const [user, authError] = await requireAuth(req);
  if (authError) return [null, authError];
  if (!hasPermission(user, module, action)) {
    return [user, forbidden(`You don't have '${action}' permission for this module`)];
  }
  return [user, null];
}

// ---------- Input validation ----------
// Simple field validation (not a full schema library, but enough for ERP records).
export interface ValidationError {
  field: string;
  message: string;
}

export function validateRequired(data: Record<string, any>, fields: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of fields) {
    const v = data[f];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
      errors.push({ field: f, message: `${f} is required` });
    }
  }
  return errors;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate a record's data against a register's column definitions
// Returns an array of validation errors (empty if valid)
export function validateRecordData(
  data: Record<string, any>,
  columns: { name: string; type: string; required?: boolean; options?: string[] }[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const col of columns) {
    const val = data[col.name];
    const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);

    if (col.required && isEmpty && col.type !== 'auto_increment') {
      errors.push({ field: col.name, message: `${col.name} is required` });
      continue;
    }
    if (isEmpty) continue; // optional + empty = OK

    // Type-specific validation
    switch (col.type) {
      case 'email':
        if (!isValidEmail(String(val))) {
          errors.push({ field: col.name, message: `${col.name} must be a valid email address` });
        }
        break;
      case 'number':
      case 'currency':
      case 'percentage':
        if (isNaN(Number(val))) {
          errors.push({ field: col.name, message: `${col.name} must be a number` });
        }
        break;
      case 'rating':
        const n = Number(val);
        if (isNaN(n) || n < 1 || n > 5) {
          errors.push({ field: col.name, message: `${col.name} must be between 1 and 5` });
        }
        break;
      case 'dropdown':
      case 'status':
      case 'priority':
        if (col.options && col.options.length > 0 && !col.options.includes(String(val))) {
          errors.push({ field: col.name, message: `${col.name} must be one of: ${col.options.join(', ')}` });
        }
        break;
      case 'multi_select':
      case 'tags':
        if (!Array.isArray(val)) {
          errors.push({ field: col.name, message: `${col.name} must be an array` });
        } else if (col.options && col.options.length > 0) {
          const invalid = val.filter((v) => !col.options!.includes(String(v)));
          if (invalid.length > 0) {
            errors.push({ field: col.name, message: `${col.name} contains invalid options: ${invalid.join(', ')}` });
          }
        }
        break;
      case 'url':
        try {
          new URL(String(val));
        } catch {
          errors.push({ field: col.name, message: `${col.name} must be a valid URL` });
        }
        break;
      case 'color':
        if (!/^#[0-9A-Fa-f]{6}$/.test(String(val))) {
          errors.push({ field: col.name, message: `${col.name} must be a hex color (e.g. #FF0000)` });
        }
        break;
    }
  }
  return errors;
}

// ---------- Pagination helpers ----------
export function parsePagination(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(500, Math.max(5, parseInt(url.searchParams.get('pageSize') || '25')));
  const search = (url.searchParams.get('search') || '').trim();
  const sortField = url.searchParams.get('sortField') || '';
  const sortDir = (url.searchParams.get('sortDir') || 'asc') as 'asc' | 'desc';
  return { page, pageSize, search, sortField, sortDir, url };
}

// ---------- Success response helper ----------
export function ok<T>(data: T, message?: string) {
  return NextResponse.json({ ok: true, data, message });
}
