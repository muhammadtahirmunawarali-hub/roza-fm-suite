// Roza FM Suite — Seed PostgreSQL Database (fresh deploy)
import { db } from '../src/lib/db';
import { seedDatabase } from '../src/lib/erp/seed';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('❌ DATABASE_URL not set'); process.exit(1); }
  if (!url.startsWith('postgresql://')) {
    console.error('❌ DATABASE_URL must be PostgreSQL for this script. Got:', url.slice(0, 20));
    process.exit(1);
  }
  console.log('🌱 Seeding PostgreSQL database...');
  const result = await seedDatabase(true);
  if (result.seeded) {
    console.log('✅ Seed complete!');
    console.log(`   Registers: ${result.registers}`);
    console.log(`   Records:   ${result.records}`);
    console.log(`   Users:     ${result.users}`);
    console.log('\n🎯 Demo logins (bcrypt-hashed):');
    console.log('   admin/admin123    (Super Admin)');
    console.log('   john/john123      (Manager)');
    console.log('   ahmed/ahmed123    (Technician)');
  } else {
    console.log('ℹ️  Already seeded:', result.reason);
  }
}
main().catch((e) => { console.error('Seed failed:', e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
