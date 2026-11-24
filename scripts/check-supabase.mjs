// Read-only smoke check, NOT the hosted RLS/admin/upload acceptance suite.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';

const { url, key } = getSupabaseConfig();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
for (const table of ['categories','products','product_categories','product_images','product_variants','store_settings','homepage_banners']) {
  const { error } = await db.from(table).select('*').limit(0);
  assert.equal(error, null, `${table}: migration / API access check failed`);
}
for (const table of ['orders','order_items']) {
  const { error } = await db.from(table).select('id').limit(1);
  assert.equal(error?.code, '42501', `${table}: anonymous access must be denied`);
}
const { error } = await db.rpc('is_store_admin');
assert.equal(error?.code, '42501', 'Anonymous admin RPC access must be denied');
console.log('Supabase API reachable; public-table grants and anonymous order/admin denials verified.');
console.log('This does not verify authenticated admin operations, image uploads or concurrent checkout.');
