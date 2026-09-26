// Roza FM Suite — Global search
// TENANT ISOLATION: queries scoped via tenantWhere(user); a tenant only sees its own data.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';
import { tenantWhere } from '@/lib/erp/tenant';
import { forbidden } from '@/lib/erp/api-helpers';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return forbidden('Authentication required');

  const q = req.nextUrl.searchParams.get('q') || '';
  if (q.trim().length < 2) return NextResponse.json([]);

  const registers = await db.register.findMany({
    where: { ...tenantWhere(user), isDeleted: false },
    include: { records: { where: { ...tenantWhere(user), isDeleted: false } } },
  });
  const query = q.toLowerCase();
  const results: { registerId: string; registerName: string; records: any[] }[] = [];

  for (const r of registers) {
    const matches = r.records
      .filter((rec) => {
        const data = JSON.parse(rec.data);
        return Object.values(data).some((v) => {
          if (v === null || v === undefined) return false;
          if (Array.isArray(v)) return v.some((x) => String(x).toLowerCase().includes(query));
          return String(v).toLowerCase().includes(query);
        });
      })
      .slice(0, 5)
      .map((rec) => ({
        id: rec.id,
        registerId: r.id,
        sequence: rec.sequence,
        data: JSON.parse(rec.data),
        isDeleted: rec.isDeleted,
        createdAt: rec.createdAt.toISOString(),
        updatedAt: rec.updatedAt.toISOString(),
      }));
    if (matches.length > 0) {
      results.push({ registerId: r.id, registerName: r.name, records: matches });
    }
  }

  return NextResponse.json(results);
}
