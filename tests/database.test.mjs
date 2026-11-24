import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createTestDatabase, withRole } from './helpers/database.mjs';

const C = '10000000-0000-4000-8000-000000000001';
const CHILD = '10000000-0000-4000-8000-000000000002';
const P = '20000000-0000-4000-8000-000000000001';
const DRAFT = '20000000-0000-4000-8000-000000000002';
const V = '30000000-0000-4000-8000-000000000001';
const ZERO = '30000000-0000-4000-8000-000000000002';
const ADMIN = '40000000-0000-4000-8000-000000000001';
const USER = '40000000-0000-4000-8000-000000000002';
const PATH = `products/${P}/00000000-0000-4000-8000-000000000001.webp`;
const DRAFT_PATH = `products/${DRAFT}/00000000-0000-4000-8000-000000000002.webp`;
let db;
before(async () => {
  db = await createTestDatabase();
  await db.exec(`
    insert into auth.users(id) values ('${ADMIN}'),('${USER}');
    insert into private.admin_users(user_id) values ('${ADMIN}');
    update public.products set status='published', published_at=now() where id='${P}';
    insert into public.product_images(product_id,storage_path,is_primary) values
      ('${P}','${PATH}',true), ('${DRAFT}','${DRAFT_PATH}',true);
    insert into storage.objects(bucket_id,name) values ('store-media','${PATH}'),('store-media','${DRAFT_PATH}');
    insert into public.store_settings(key,value,is_public) values ('brand','{"name":"TEST"}',true),('contacts','{}',false);
    insert into public.orders(id,idempotency_key,request_fingerprint,customer_name,customer_phone,city,delivery_method,delivery_address,total_kopecks)
      values ('50000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002',repeat('a',64),'TEST','TEST-000000','TEST','TEST','TEST',149900);
    insert into public.order_items(order_id,product_id,variant_id,product_name,sku,size,color,unit_price_kopecks,quantity,line_total_kopecks)
      values ('50000000-0000-4000-8000-000000000001','${P}','${V}','TEST SNAPSHOT','TEST-SNAPSHOT','28','TEST',149900,1,149900);
  `);
});
after(async () => { await db?.close(); });

test('migrations enable RLS on every public table and restrict private functions', async () => {
  const { rows } = await db.query("select relname, relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r'");
  assert.equal(rows.length, 9);
  assert(rows.every(r => r.relrowsecurity));
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='private.admin_users'::regclass")).rows[0].relrowsecurity,true);
  for (const role of ['anon','authenticated']) {
    const r = await db.query("select has_function_privilege($1,'private.reserve_inventory(jsonb)','execute') as allowed",[role]);
    assert.equal(r.rows[0].allowed, false);
  }
});

test('anonymous visitor reads only published catalog, visible categories and public settings', async () => {
  await withRole(db,'anon',null,async d => {
    assert.deepEqual((await d.query('select id from public.products')).rows.map(r=>r.id),[P]);
    assert.equal((await d.query('select * from public.categories')).rows.length,2);
    assert.equal((await d.query('select * from public.product_images')).rows.length,1);
    assert.equal((await d.query('select * from public.product_variants')).rows.length,2);
    assert.deepEqual((await d.query('select key from public.store_settings')).rows,[{key:'brand'}]);
  });
});

test('hidden ancestor hides child categories, products, variants and media', async () => {
  await db.exec('begin');
  try {
    await db.query('update public.categories set is_visible=false where id=$1',[C]);
    await db.exec('set local role anon');
    for (const table of ['categories','products','product_images','product_variants','product_categories']) {
      assert.equal((await db.query(`select * from public.${table}`)).rows.length,0,table);
    }
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
  } finally { await db.exec('rollback'); }
});

test('anonymous visitor cannot change prices or read orders', async () => {
  await assert.rejects(withRole(db,'anon',null,d=>d.query('update public.products set price_kopecks=1')), /permission denied/);
  await assert.rejects(withRole(db,'anon',null,d=>d.query('select * from public.orders')), /permission denied/);
  await assert.rejects(withRole(db,'anon',null,d=>d.query('select * from public.order_items')), /permission denied/);
});

test('ordinary authenticated user cannot elevate role, write catalog or read orders', async () => {
  await withRole(db,'authenticated',USER,async d=> {
    assert.equal((await d.query('select private.is_admin() as admin')).rows[0].admin,false);
    assert.equal((await d.query('select public.is_store_admin() as admin')).rows[0].admin,false);
    assert.equal((await d.query('select * from public.orders')).rows.length,0);
    assert.equal((await d.query('select * from public.order_items')).rows.length,0);
    assert.equal((await d.query('update public.product_variants set stock=999 returning id')).rows.length,0);
    assert.equal((await d.query('update public.products set price_kopecks=1 returning id')).rows.length,0);
  });
  await assert.rejects(withRole(db,'authenticated',USER,d=>d.query('insert into private.admin_users(user_id) values ($1)',[USER])),/permission denied/);
  await assert.rejects(withRole(db,'authenticated',USER,d=>d.query("insert into public.categories(slug,name) values ('illegal','TEST')")),/row-level security/);
});

test('verified database admin can maintain catalog and read orders, but cannot bypass checkout writes', async () => {
  await withRole(db,'authenticated',ADMIN,async d=> {
    assert.equal((await d.query('select private.is_admin() as admin')).rows[0].admin,true);
    assert.equal((await d.query('select public.is_store_admin() as admin')).rows[0].admin,true);
    assert.equal((await d.query('select * from public.products')).rows.length,2);
    assert.equal((await d.query('select * from public.orders')).rows.length,1);
    assert.equal((await d.query('select * from public.order_items')).rows.length,1);
    assert.equal((await d.query('update public.products set price_kopecks=159900 where id=$1 returning id',[P])).rows.length,1);
    assert.equal((await d.query("insert into public.categories(slug,name) values ('admin-test','TEST') returning id")).rows.length,1);
  });
  await assert.rejects(withRole(db,'authenticated',ADMIN,d=>d.query("delete from public.orders")),/permission denied/);
});

test('constraints reject duplicate SKU, negative stock, bad discount and invalid relationships', async () => {
  const invalid = [
    ["insert into public.products(slug,sku,name,price_kopecks) values ('duplicate','TEST-DENIM','TEST',1)",[]],
    ['update public.product_variants set stock=-1 where id=$1',[V]],
    ['update public.products set old_price_kopecks=price_kopecks where id=$1',[P]],
    ["insert into public.product_categories values ($1,'00000000-0000-4000-8000-000000000099')",[P]],
    ['delete from public.categories where id=$1',[C]],
    ['update public.categories set parent_id=$1 where id=$2',[CHILD,C]],
    ["insert into public.product_images(product_id,storage_path,is_primary) values ($1,$2,true)",[P,`products/${P}/a.webp`]],
    ["update public.order_items set line_total_kopecks=1",[]],
    ['update public.order_items set product_id=$1',[DRAFT]],
  ];
  for (const [sql,params] of invalid) {
    await db.exec('begin');
    try { await assert.rejects(db.query(sql,params)); } finally { await db.exec('rollback'); }
  }
});

test('publication without timestamp is rejected; future and archived products stay private',async()=>{
  await db.exec('begin');
  try {
    await db.query("update public.products set published_at=now()+interval '1 day' where id=$1",[P]);
    await db.exec('set local role anon');
    assert.equal((await db.query('select * from public.products')).rows.length,0);
  } finally { await db.exec('rollback'); }
  await db.exec('begin');
  try {
    await db.query("update public.products set status='archived' where id=$1",[P]);
    await db.exec('set local role anon');
    assert.equal((await db.query('select * from public.products')).rows.length,0);
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
  } finally { await db.exec('rollback'); }
  await assert.rejects(withRole(db,'authenticated',ADMIN,d=>d.query("update public.products set status='published',published_at=null where id=$1",[DRAFT])));
});

test('inactive variants and unpublished/scheduled banners are hidden',async()=>{
  await db.exec('begin');
  try {
    await db.query('update public.product_variants set is_active=false where id=$1',[V]);
    await db.exec(`insert into public.homepage_banners(id,title,image_path,is_visible,starts_at) values
      ('60000000-0000-4000-8000-000000000001','TEST','banners/60000000-0000-4000-8000-000000000001/a.webp',true,null),
      ('60000000-0000-4000-8000-000000000002','TEST','banners/60000000-0000-4000-8000-000000000002/a.webp',false,null),
      ('60000000-0000-4000-8000-000000000003','TEST','banners/60000000-0000-4000-8000-000000000003/a.webp',true,now()+interval '1 day')`);
    await db.exec('set local role anon');
    assert.equal((await db.query('select * from public.product_variants')).rows.length,1);
    assert.equal((await db.query('select * from public.homepage_banners')).rows.length,1);
  } finally { await db.exec('rollback'); }
});

test('order snapshots remain stable after price changes; duplicate idempotency keys rejected',async()=>{
  await db.exec('begin');
  try {
    await db.query('update public.products set price_kopecks=1 where id=$1',[P]);
    assert.equal((await db.query('select unit_price_kopecks from public.order_items')).rows[0].unit_price_kopecks,149900);
    await assert.rejects(db.query(`insert into public.orders(idempotency_key,request_fingerprint,customer_name,customer_phone,city,delivery_method,delivery_address,total_kopecks)
      select idempotency_key,request_fingerprint,customer_name,customer_phone,city,delivery_method,delivery_address,total_kopecks from public.orders`),/unique constraint/);
  } finally { await db.exec('rollback'); }
});

test('owner-only inventory primitive aggregates duplicates, rejects overselling and rolls back partial changes',async()=>{
  await db.exec('begin');
  try {
    await db.query('select private.reserve_inventory($1::jsonb)',[JSON.stringify([{variant_id:V,quantity:1},{variant_id:V,quantity:1}])]);
    assert.equal((await db.query('select stock from public.product_variants where id=$1',[V])).rows[0].stock,1);
  } finally { await db.exec('rollback'); }
  await assert.rejects(db.query('select private.reserve_inventory($1::jsonb)',[JSON.stringify([{variant_id:V,quantity:1},{variant_id:ZERO,quantity:1}])]),/insufficient stock/);
  assert.equal((await db.query('select stock from public.product_variants where id=$1',[V])).rows[0].stock,3);
  await assert.rejects(db.query('select private.reserve_inventory($1::jsonb)',[JSON.stringify([{variant_id:V,quantity:4}])]),/insufficient stock/);
  for (const items of [[],null,{},[{variant_id:V,quantity:-1}],[{variant_id:V,quantity:1.5}],[{variant_id:V,quantity:'1'}]]) {
    await assert.rejects(db.query('select private.reserve_inventory($1::jsonb)',[JSON.stringify(items)]));
  }
  await assert.rejects(withRole(db,'authenticated',ADMIN,d=>d.query('select private.reserve_inventory($1::jsonb)',[JSON.stringify([{variant_id:V,quantity:1}])])),/permission denied/);
});

test('Storage bucket is private with strict image MIME and size settings',async()=>{
  const b=(await db.query("select * from storage.buckets where id='store-media'")).rows[0];
  assert.equal(b.public,false);
  assert.equal(Number(b.file_size_limit),5242880);
  assert.deepEqual(b.allowed_mime_types,['image/jpeg','image/png','image/webp']);
});

test('Storage RLS: public reads only published linked photos; ordinary user cannot upload',async()=>{
  await withRole(db,'anon',null,async d=>{
    assert.deepEqual((await d.query('select name from storage.objects')).rows,[{name:PATH}]);
  });
  await assert.rejects(withRole(db,'authenticated',USER,d=>d.query("insert into storage.objects(bucket_id,name) values ('store-media',$1)",[`products/${P}/a.webp`])),/row-level security/);
});

test('Storage RLS: admin can upload/manage valid paths; invalid paths and SVG are rejected',async()=>{
  await withRole(db,'authenticated',ADMIN,async d=>{
    assert.equal((await d.query('select name from storage.objects')).rows.length,2);
    await d.query("insert into storage.objects(bucket_id,name) values ('store-media',$1)",[`products/${P}/a.webp`]);
    assert.equal((await d.query("delete from storage.objects where name=$1 returning id",[`products/${P}/a.webp`])).rows.length,1);
  });
  for(const name of [`products/${P}/a.svg`,`products/${P}/../a.webp`,'products/00000000-0000-4000-8000-000000000099/a.webp','a.webp']){
    await assert.rejects(withRole(db,'authenticated',ADMIN,d=>d.query("insert into storage.objects(bucket_id,name) values ('store-media',$1)",[name])),/row-level security/);
  }
});
