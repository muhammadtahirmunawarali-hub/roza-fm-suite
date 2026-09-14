// Roza FM Suite — Users API (admin management)
// GET  /api/erp/users           → list all users
// POST /api/erp/users           → create a new user (requires 'create' permission on 'users' module)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRolePermissions, ROLES } from '@/lib/erp/seed';
import type { User } from '@/lib/erp/types';
import { apiHandler, requirePermission, badRequest, isValidEmail } from '@/lib/erp/api-helpers';

// The 11 valid roles defined in the seed matrix
const VALID_ROLES = ROLES.map((r) => r.id);

export const GET = apiHandler(async (req) => {
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
});

export const POST = apiHandler(async (req) => {
  // Server-side permission check (auth + permission)
  const [currentUser, permError] = await requirePermission(req, 'users', 'create');
  if (permError) return permError;

  const body = await req.json();
  const { name, email, username, password, role, department, branch, status } = body;

  // Validate required fields
  if (!name || !email || !username || !password) {
    return badRequest('Name, email, username and password are required');
  }
  if (!isValidEmail(email)) {
    return badRequest('Email must be a valid format');
  }
  if (password.length < 6) {
    return badRequest('Password must be at least 6 characters');
  }

  // Validate role (defaults to Viewer if not provided)
  const finalRole = role || 'Viewer';
  if (!VALID_ROLES.includes(finalRole)) {
    return badRequest(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  // Check for duplicates
  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail) {
    return badRequest('Email already in use');
  }
  const existingUsername = await db.user.findUnique({ where: { username: String(username).toLowerCase() } });
  if (existingUsername) {
    return badRequest('Username already taken');
  }

  const initials = String(name).split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

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
});
