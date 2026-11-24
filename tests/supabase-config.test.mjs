import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';

test('Supabase config fails closed and rejects privileged keys',()=>{
  const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
  const previous=names.map(n=>process.env[n]);
  try {
    for(const n of names) delete process.env[n];
    assert.throws(getSupabaseConfig,/not configured/);
    process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_secret_TEST';
    assert.throws(getSupabaseConfig,/publishable key/);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_TEST';
    assert.equal(getSupabaseConfig().url,'https://example.supabase.co');
    process.env.NEXT_PUBLIC_SUPABASE_URL='http://example.com';
    assert.throws(getSupabaseConfig,/HTTPS/);
  } finally {
    names.forEach((n,i)=>{if(previous[i]===undefined) delete process.env[n]; else process.env[n]=previous[i];});
  }
});
