// FMCore ERP — User by ID (GET / PUT / DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRolePermissions } from '@/lib/erp/seed';
import type { User } from '@/lib/erp/types';

function serialize(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    branch: u.branch,
    department: u.department,
    avatar: u.avatar,
    status: u.status,
    permissions: JSON.parse(u.permissions),
    lastLoginAt: u.lastLoginAt?.toISOString() || null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id } });
  if (!u) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json(serialize(u));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { name, email, username, password, role, department, branch, status, permissions } = body;

  // If role changes, regenerate permissions unless explicitly provided
  let perms = existing.permissions;
  if (role && role !== existing.role) {
    perms = JSON.stringify(getRolePermissions(role));
  }
  if (permissions) {
    perms = JSON.stringify(permissions);
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name, avatar: String(name).split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() }),
      ...(email !== undefined && { email }),
      ...(username !== undefined && { username: String(username).toLowerCase() }),
      ...(password !== undefined && password !== '' && { password }),
      ...(role !== undefined && { role }),
      ...(department !== undefined && { department }),
      ...(branch !== undefined && { branch }),
      ...(status !== undefined && { status }),
      permissions: perms,
    },
  });

  await db.auditLog.create({
    data: {
      userId: id,
      action: 'Updated',
      module: 'Users',
      summary: `Updated user "${existing.name}"`,
      oldValue: JSON.stringify(serialize(existing)),
      newValue: JSON.stringify(serialize(updated)),
    },
  });

  return NextResponse.json(serialize(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // Don't hard-delete — just set status to Inactive (soft delete) to preserve audit log integrity
  await db.user.update({ where: { id }, data: { status: 'Inactive' } });
  // Also invalidate all sessions
  await db.session.deleteMany({ where: { userId: id } });

  await db.auditLog.create({
    data: {
      action: 'Deleted',
      module: 'Users',
      summary: `Deactivated user "${existing.name}"`,
      oldValue: JSON.stringify(serialize(existing)),
    },
  });
  return NextResponse.json({ ok: true });
}
