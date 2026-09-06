// FMCore ERP — Users API (admin management)
// GET  /api/erp/users           → list all users
// POST /api/erp/users           → create a new user (requires 'create' permission on 'users' module)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRolePermissions } from '@/lib/erp/seed';
import type { User } from '@/lib/erp/types';
import { getCurrentUser, hasPermission } from '@/lib/erp/auth';

export async function GET() {
  const rows = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const users: User[] = rows.map((u) => ({
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
  }));

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  // Server-side permission check
  const currentUser = await getCurrentUser(req);
  if (currentUser && !hasPermission(currentUser, 'users', 'create')) {
    return NextResponse.json({ ok: false, error: "You don't have permission to create users" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, username, password, role, department, branch, status } = body;

  if (!name || !email || !username || !password) {
    return NextResponse.json({ ok: false, error: 'Name, email, username and password are required' }, { status: 400 });
  }

  // Check for duplicates
  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ ok: false, error: 'Email already in use' }, { status: 400 });
  }
  const existingUsername = await db.user.findUnique({ where: { username: String(username).toLowerCase() } });
  if (existingUsername) {
    return NextResponse.json({ ok: false, error: 'Username already taken' }, { status: 400 });
  }

  const initials = String(name).split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const finalRole = role || 'Viewer';

  const user = await db.user.create({
    data: {
      name,
      email,
      username: String(username).toLowerCase(),
      password, // plaintext for demo
      role: finalRole,
      department: department || null,
      branch: branch || null,
      avatar: initials,
      status: status || 'Active',
      permissions: JSON.stringify(getRolePermissions(finalRole)),
    },
  });

  await db.auditLog.create({
    data: {
      userId: currentUser?.id || null,
      action: 'Created',
      module: 'Users',
      summary: `Created user "${name}" with role ${finalRole}`,
      newValue: JSON.stringify({ name, email, role: finalRole }),
    },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    branch: user.branch,
    department: user.department,
    avatar: user.avatar,
    status: user.status,
    permissions: JSON.parse(user.permissions),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  } satisfies User);
}
