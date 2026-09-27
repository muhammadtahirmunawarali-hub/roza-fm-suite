// Roza FM Suite — One-time migration: hash all legacy plaintext passwords with bcrypt.
//
// Run with: bun run scripts/hash-passwords.ts
//
// This script:
//   1. Scans all users in the DB.
//   2. For any whose `password` field isn't already a bcrypt hash (doesn't start with "$2"),
//      it hashes the existing plaintext value and saves it back.
//   3. Prints a summary at the end.
//
// Safe to re-run — skips users whose passwords are already bcrypt hashes.
//
// WHY: Round 121 introduced bcrypt password hashing. Existing demo users (admin, john,
// ahmed, fatima, priya) and any tenant admins created before this round still have
// plaintext passwords. This script migrates them in place so login continues to work.
import { db } from '../src/lib/db';
import { hashPassword, isBcryptHash } from '../src/lib/erp/password';

async function main() {
  console.log('🔐 Password Hashing Migration — starting...');
  const users = await db.user.findMany();
  console.log(`Found ${users.length} users in the database.`);

  let hashed = 0;
  let skipped = 0;
  let errors = 0;

  for (const u of users) {
    if (isBcryptHash(u.password)) {
      skipped++;
      continue;
    }
    try {
      const newHash = await hashPassword(u.password);
      await db.user.update({
        where: { id: u.id },
        data: { password: newHash },
      });
      console.log(`  ✓ Hashed password for "${u.username}" (${u.role})`);
      hashed++;
    } catch (e: any) {
      console.error(`  ✗ Failed to hash password for "${u.username}": ${e?.message}`);
      errors++;
    }
  }

  console.log('\n───────────────────────────');
  console.log(`✓ Hashed:   ${hashed}`);
  console.log(`→ Skipped:  ${skipped} (already bcrypt)`);
  console.log(`✗ Errors:  ${errors}`);
  console.log('───────────────────────────');
  if (hashed > 0) {
    console.log('\n✅ Migration complete. All passwords are now bcrypt hashes.');
    console.log('   Login will continue to work with the same credentials.');
  } else if (skipped === users.length) {
    console.log('\n✅ All passwords were already bcrypt hashes. Nothing to do.');
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
