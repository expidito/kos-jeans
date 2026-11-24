import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';

export async function createTestDatabase() {
  const db = new PGlite();
  await db.exec(await readFile('tests/helpers/supabase-platform.sql', 'utf8'));
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  }
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  return db;
}

export async function withRole(db, role, user, callback) {
  if (!['anon', 'authenticated'].includes(role)) throw new Error('invalid test role');
  await db.exec('begin');
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
    await db.exec(`set local role ${role}`);
    return await callback(db);
  } finally {
    await db.exec('rollback');
  }
}
