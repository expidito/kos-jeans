import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adminConfigured,validCredentials,verifyAdmin,sameOrigin,adminSections} from '../src/lib/admin/policy.ts';

test('admin is isolated from production even if development keys are present',()=>{
  const env={NEXT_PUBLIC_SUPABASE_URL:'https://example.com',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
  assert.equal(adminConfigured(env),true);
  assert.equal(adminConfigured({...env,VERCEL_ENV:'preview'}),true);
  assert.equal(adminConfigured({...env,VERCEL_ENV:'production'}),false);
  assert.equal(adminConfigured({}),false);
});
test('validated Auth identity and live database role are both mandatory',async()=>{
  let roleRead=false;
  assert.deepEqual(await verifyAdmin(async()=>null,async()=>{roleRead=true;return true;}),{status:'unauthenticated'});
  assert.equal(roleRead,false);
  const forged={id:'ordinary',user_metadata:{role:'admin',is_admin:true},app_metadata:{role:'admin'}};
  assert.deepEqual(await verifyAdmin(async()=>forged,async()=>false),{status:'forbidden'});
  const user={id:'verified-user',email:'owner@example.com'};
  assert.deepEqual(await verifyAdmin(async()=>user,async()=>true),{status:'admin',user});
});
test('expired identity, role revocation and Auth/database outages never grant access',async()=>{
  assert.equal((await verifyAdmin(async()=>null,async()=>true)).status,'unauthenticated');
  assert.equal((await verifyAdmin(async()=>({id:'revoked-admin'}),async()=>false)).status,'forbidden');
  await assert.rejects(verifyAdmin(async()=>{throw Error('Auth unavailable');},async()=>true));
  await assert.rejects(verifyAdmin(async()=>({id:'user'}),async()=>{throw Error('Role unavailable');}));
});
test('login/logout only accept the exact same origin',()=>{
  const url='https://preview.example.com/admin/auth/login';
  assert.equal(sameOrigin('https://preview.example.com',url),true);
  for(const origin of [null,'null','https://evil.example.com','http://preview.example.com','https://preview.example.com.evil.test','https://preview.example.com:8080','not a URL'])assert.equal(sameOrigin(origin,url),false);
});
test('credentials are bounded without disclosing password/account details',()=>{
  assert.equal(validCredentials('owner@example.com','a valid private password'),true);
  for(const [email,password] of [['','x'],['owner','x'],['owner@example.com',''],['x'.repeat(255)+'@example.com','x'],['owner@example.com','x'.repeat(1025)]])assert.equal(validCredentials(email,password),false);
  assert.equal(new Set(adminSections.map(s=>s.href)).size,7);
});
