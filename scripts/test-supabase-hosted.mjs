// Explicit dev-only integration tests. No credentials, keys or API response bodies are logged.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';

const checks = [];
let stage = 'dev target validation';
let adminApi, temporaryDirectory;
const createdUsers = [];
const uploadedPaths = [];
const ids = Object.fromEntries(['category','hiddenCategory','child','product','draft','variant','draftVariant','image','draftImage','order','item'].map(k=>[k,randomUUID()]));
const prefix = `foundation-check-${randomUUID()}`;
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const cli = args => JSON.parse(execFileSync('npx',['--yes','supabase@3.3.0',...args,'--output-format','json'],{
  encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024,
}));
const record = label => { checks.push({check:label,status:'pass'}); console.log(`PASS: ${label}`); };
const { url, key } = getSupabaseConfig();
const ref = new URL(url).hostname.split('.')[0];
let sql;
let failure = false;
let evidence = {};

try {
  assert(process.argv.includes('--dev-only'));
  const projects=cli(['projects','list']).projects;
  assert(projects.some(p=>(p.id===ref||p.ref===ref)&&p.name==='kos-jeans-dev'));
  assert(/^[a-z]{20}$/.test(ref));
  const settingsResponse=await fetch(new URL('/auth/v1/settings',url),{headers:{apikey:key}});
  assert(settingsResponse.ok);
  assert.equal((await settingsResponse.json()).disable_signup,true);
  record('Public signup is disabled in the hosted development project');
  temporaryDirectory=await mkdtemp(join(tmpdir(),'kos-supabase-check-'));
  sql=async statement=>{
    const path=join(temporaryDirectory,'query.sql');
    await writeFile(path,statement,{mode:0o600});
    return cli(['db','query',`--remote=${ref}`,'--file',path,'--yes']).rows;
  };
  const keys=cli(['projects','api-keys',`--remote=${ref}`,'--reveal']).keys;
  const secret=keys.find(k=>k.api_key?.startsWith('sb_secret_'))?.api_key
    ?? keys.find(k=>k.name==='service_role')?.api_key;
  assert(secret);
  adminApi=createClient(url,secret,options);
  record('Target is the explicitly named development project');

  stage='temporary Auth users';
  const clients=[];
  for(const role of ['ordinary','admin']) {
    const email=`${prefix}-${role}@example.com`;
    const password=randomBytes(32).toString('base64url');
    const created=await adminApi.auth.admin.createUser({email,password,email_confirm:true});
    assert(!created.error&&created.data.user);
    createdUsers.push(created.data.user.id);
    const client=createClient(url,key,options);
    const signed=await client.auth.signInWithPassword({email,password});
    assert(!signed.error&&signed.data.session);
    clients.push(client);
  }
  const [ordinary,admin]=clients;
  const visitor=createClient(url,key,options);
  await sql(`insert into private.admin_users(user_id) values ('${createdUsers[1]}');`);
  assert.equal((await ordinary.rpc('is_store_admin')).data,false);
  assert.equal((await admin.rpc('is_store_admin')).data,true);
  record('Real Auth JWT: ordinary user false / assigned admin true');

  stage='test fixtures';
  const imagePath=`products/${ids.product}/${ids.image}.png`;
  const draftPath=`products/${ids.draft}/${ids.draftImage}.png`;
  const fixture=await sql(`begin;
    insert into public.categories(id,slug,name,is_visible) values
      ('${ids.category}','${prefix}-visible','TEST FOUNDATION',true),
      ('${ids.hiddenCategory}','${prefix}-hidden','TEST FOUNDATION',false);
    insert into public.categories(id,parent_id,slug,name,is_visible) values
      ('${ids.child}','${ids.hiddenCategory}','${prefix}-child','TEST FOUNDATION',true);
    insert into public.products(id,slug,sku,name,price_kopecks,status,published_at) values
      ('${ids.product}','${prefix}-published','${prefix}-published','TEST FOUNDATION',149900,'published',now()),
      ('${ids.draft}','${prefix}-draft','${prefix}-draft','TEST FOUNDATION',99900,'draft',null);
    insert into public.product_categories(product_id,category_id) values
      ('${ids.product}','${ids.category}'),('${ids.draft}','${ids.category}');
    insert into public.product_variants(id,product_id,sku,size,color,stock,is_active) values
      ('${ids.variant}','${ids.product}','${prefix}-28','28','TEST',3,true),
      ('${ids.draftVariant}','${ids.draft}','${prefix}-30','30','TEST',0,true);
    insert into public.product_images(id,product_id,storage_path,is_primary) values
      ('${ids.image}','${ids.product}','${imagePath}',true),
      ('${ids.draftImage}','${ids.draft}','${draftPath}',true);
    insert into public.orders(id,idempotency_key,request_fingerprint,customer_name,customer_phone,city,delivery_method,delivery_address,total_kopecks)
      values ('${ids.order}','${randomUUID()}',repeat('f',64),'TEST FOUNDATION','TEST-000000','TEST','TEST','TEST',149900);
    insert into public.order_items(id,order_id,product_id,variant_id,product_name,sku,size,color,unit_price_kopecks,quantity,line_total_kopecks)
      values ('${ids.item}','${ids.order}','${ids.product}','${ids.variant}','TEST FOUNDATION','TEST','28','TEST',149900,1,149900);
    commit; select true as fixtures_ready;`);
  assert(fixture.some(r=>r.fixtures_ready));

  stage='public catalog and order privacy';
  for(const client of [visitor,ordinary]) {
    const p=await client.from('products').select('id').in('id',[ids.product,ids.draft]);
    assert(!p.error); assert.deepEqual(p.data.map(x=>x.id),[ids.product]);
    const c=await client.from('categories').select('id').in('id',[ids.category,ids.hiddenCategory,ids.child]);
    assert(!c.error); assert.deepEqual(c.data.map(x=>x.id),[ids.category]);
    const v=await client.from('product_variants').select('id').in('id',[ids.variant,ids.draftVariant]);
    assert(!v.error); assert.deepEqual(v.data.map(x=>x.id),[ids.variant]);
    for(const table of ['orders','order_items']) {
      const r=await client.from(table).select('id').eq('id',table==='orders'?ids.order:ids.item);
      assert(r.error?.code==='42501'||(!r.error&&r.data.length===0));
    }
  }
  record('Anon and ordinary JWT see published data only; hidden ancestors and orders are protected');

  stage='ordinary writes denied';
  for(const client of [visitor,ordinary]) {
    for(const [table,change,id] of [
      ['products',{name:'ILLEGAL',price_kopecks:1},ids.product],
      ['product_variants',{size:'ILLEGAL',color:'ILLEGAL',stock:999},ids.variant],
    ]) {
      const r=await client.from(table).update(change).eq('id',id).select('id');
      assert(r.error||r.data.length===0);
    }
    const added=await client.from('products').insert({slug:prefix+'-illegal',sku:prefix+'-illegal',name:'ILLEGAL',price_kopecks:1});
    assert(added.error);
  }
  const product=await admin.from('products').select('name,price_kopecks').eq('id',ids.product).single();
  assert.equal(product.data?.name,'TEST FOUNDATION');assert.equal(product.data.price_kopecks,149900);
  const variant=await admin.from('product_variants').select('size,color,stock').eq('id',ids.variant).single();
  assert.deepEqual(variant.data,{size:'28',color:'TEST',stock:3});
  record('Anon/ordinary cannot add products or change product prices, sizes, colors or stock');

  stage='admin writes and DB constraints';
  const edited=await admin.from('products').update({price_kopecks:159900}).eq('id',ids.product).select('price_kopecks').single();
  assert.equal(edited.data?.price_kopecks,159900);
  const invalidStock=await admin.from('product_variants').update({stock:-1}).eq('id',ids.variant);
  assert.equal(invalidStock.error?.code,'23514');
  const duplicate=await admin.from('products').insert({slug:prefix+'-duplicate',sku:prefix+'-published',name:'TEST',price_kopecks:1});
  assert.equal(duplicate.error?.code,'23505');
  const snapshot=await admin.from('order_items').select('unit_price_kopecks').eq('id',ids.item).single();
  assert.equal(snapshot.data?.unit_price_kopecks,149900);
  const orderWrite=await admin.from('orders').update({total_kopecks:1}).eq('id',ids.order);
  assert.equal(orderWrite.error?.code,'42501');
  record('Admin catalog edit succeeds; negative stock/duplicate SKU fail; order snapshot is stable');

  stage='Storage API positive and negative cases';
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6M0sAAAAASUVORK5CYII=','base64');
  const bucket=c=>c.storage.from('store-media');
  for(const client of [visitor,ordinary]) {
    const r=await bucket(client).upload(`products/${ids.product}/${randomUUID()}.png`,png,{contentType:'image/png'});
    assert(r.error);
  }
  for(const path of [imagePath,draftPath]) {
    const r=await bucket(admin).upload(path,png,{contentType:'image/png'});
    assert(!r.error);uploadedPaths.push(path);
  }
  assert(!(await bucket(visitor).download(imagePath)).error);
  assert((await bucket(visitor).download(draftPath)).error);
  assert(!(await bucket(admin).download(draftPath)).error);
  const rawPublic=await fetch(`${url}/storage/v1/object/public/store-media/${imagePath}`);
  assert(!rawPublic.ok);
  record('Storage: admin image upload/read succeeds; anon/ordinary upload and draft/public-URL access fail');

  for(const [path,body,contentType] of [
    [`products/${ids.product}/${randomUUID()}.svg`,Buffer.from('<svg/>'),'image/svg+xml'],
    [`products/${ids.product}/${randomUUID()}.png`,png,'application/octet-stream'],
    [`products/${randomUUID()}/${randomUUID()}.png`,png,'image/png'],
    [`products/${ids.product}/${randomUUID()}.png`,Buffer.alloc(5242881),'image/png'],
  ]) {
    const r=await bucket(admin).upload(path,body,{contentType});
    if(!r.error) uploadedPaths.push(path);
    assert(r.error);
  }
  record('Storage API rejects SVG, disallowed MIME, unknown parent path and files larger than 5 MiB');

  stage='unpublishing media';
  assert(!(await admin.from('products').update({status:'draft'}).eq('id',ids.product)).error);
  assert((await bucket(visitor).download(imagePath)).error);
  record('Unpublishing a product revokes new public image downloads');
} catch {
  failure=true;
  console.error(`FAIL: ${stage}; credential-bearing details withheld`);
} finally {
  stage='cleanup';
  try {
    if(uploadedPaths.length) assert(!(await adminApi.storage.from('store-media').remove(uploadedPaths)).error);
    if(sql) {
      await sql(`begin;
        delete from public.order_items where id='${ids.item}';
        delete from public.orders where id='${ids.order}';
        delete from public.products where id in ('${ids.product}','${ids.draft}');
        delete from public.categories where id='${ids.child}';
        delete from public.categories where id in ('${ids.category}','${ids.hiddenCategory}');
        commit; select true as fixtures_removed;`);
    }
    for(const userId of createdUsers) assert(!(await adminApi.auth.admin.deleteUser(userId)).error);
    if(sql) {
      const [summary]=await sql(`select
        (select array_agg(version order by version) from supabase_migrations.schema_migrations) as versions,
        (select count(*)::int from pg_tables where schemaname='public' and rowsecurity and tablename in
          ('categories','products','product_categories','product_images','product_variants','orders','order_items','store_settings','homepage_banners')) as rls_tables,
        ((select count(*) from public.products where id in ('${ids.product}','${ids.draft}'))+
         (select count(*) from public.categories where id in ('${ids.category}','${ids.hiddenCategory}','${ids.child}'))+
         (select count(*) from public.orders where id='${ids.order}'))::int as fixture_rows,
        (select count(*)::int from storage.objects where bucket_id='store-media' and name like 'products/${ids.product}/%'
          or bucket_id='store-media' and name like 'products/${ids.draft}/%') as media_objects,
        (select count(*)::int from auth.users where email like '${prefix}-%@example.com') as auth_users;`);
      assert.equal(summary.rls_tables,9);
      assert.equal(summary.fixture_rows+summary.media_objects+summary.auth_users,0);
      evidence={migrationVersions:summary.versions,publicTablesWithRls:summary.rls_tables,
        cleanupCounts:{ownFixtureRows:summary.fixture_rows,ownMediaObjects:summary.media_objects,ownAuthUsers:summary.auth_users}};
    }
    if(temporaryDirectory) await rm(temporaryDirectory,{recursive:true,force:true});
    record('Own temporary database fixtures, Auth users and Storage objects removed');
  } catch {
    failure=true;
    console.error('FAIL: cleanup; credential-bearing details withheld');
  }
  await mkdir('docs/checks',{recursive:true});
  await writeFile('docs/checks/block05-hosted.json',JSON.stringify({
    executedAt:new Date().toISOString(),environment:'kos-jeans-dev',
    status:failure?'failed':'passed',checks,...evidence,
    limitations:['Full checkout and concurrent order sessions are reserved for block 12.'],
  },null,2)+'\n');
}
if(failure) process.exitCode=1;
