import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createTestDatabase,withRole} from './helpers/database.mjs';
import {categorySlug,categoryInput,categoryRows,descendantIds,imageExtension} from '../src/lib/categories/validation.ts';
const ADMIN='40000000-0000-4000-8000-000000000001',USER='40000000-0000-4000-8000-000000000002',C='10000000-0000-4000-8000-000000000001',CHILD='10000000-0000-4000-8000-000000000002';let db;
before(async()=>{db=await createTestDatabase();await db.exec(`insert into auth.users(id) values('${ADMIN}'),('${USER}');insert into private.admin_users values('${ADMIN}',now());`);});after(async()=>db.close());
const values=(extra={})=>({name:'ТЕСТ · Категорія',slug:'test-new-category',description:'',parent_id:C,sort_order:4,is_visible:true,image_path:null,...extra});
const write=(db,id,input,version=null,command='create',request=randomUUID())=>db.query('select public.admin_category_write($1,$2,$3::jsonb,$4::timestamptz,$5) id',[request,id,JSON.stringify(input),version,command]);
const version=async(db,id)=>(await db.query('select updated_at::text as value from public.categories where id=$1',[id])).rows[0].value;
test('category slug, form bounds, safe ancestry and image signatures',()=>{
 assert.equal(categorySlug('Джинсові куртки'),'dzhynsovi-kurtky');assert.equal(categorySlug('  KOS / Нова колекція!  '),'kos-nova-kolektsiya');
 const f=new FormData();for(const [k,v]of Object.entries(values()))if(v!==null)f.set(k,String(v));f.set('is_visible','on');assert.equal(categoryInput(f).sort_order,4);
 f.set('sort_order','1.5');assert.throws(()=>categoryInput(f));f.set('sort_order','0');f.set('slug','../admin');assert.throws(()=>categoryInput(f));
 const tree=[{id:'a',parent_id:null,name:'A',sort_order:0,is_visible:false,archived_at:null},{id:'b',parent_id:'a',name:'B',sort_order:0,is_visible:true,archived_at:null}];assert.deepEqual([...descendantIds(tree,'a')],['a','b']);assert.equal(categoryRows(tree)[1].effectiveVisible,false);
 assert.equal(imageExtension('image/jpeg',new Uint8Array([255,216,255])),'jpg');assert.throws(()=>imageExtension('image/jpeg',new TextEncoder().encode('<svg/>')));assert.throws(()=>imageExtension('image/svg+xml',new TextEncoder().encode('<svg/>')));
});
test('category RPC accepts verified admin and repeated request creates only one record',async()=>withRole(db,'authenticated',ADMIN,async d=>{
 const id=randomUUID(),request=randomUUID();await write(d,id,values(),null,'create',request);await write(d,id,values(),null,'create',request);
 assert.equal((await d.query('select count(*)::int n from public.categories where id=$1',[id])).rows[0].n,1);assert.equal((await d.query('select count(*)::int n from private.category_mutations where request_id=$1',[request])).rows[0].n,1);
}));
test('ordinary and anonymous users cannot call category writer or modify categories',async()=>{
 for(const role of ['anon','authenticated'])await assert.rejects(withRole(db,role,role==='anon'?null:USER,d=>write(d,randomUUID(),values())),/permission denied|admin required/);
 await assert.rejects(withRole(db,'authenticated',USER,d=>d.exec("insert into public.categories(name,slug) values('not allowed','not-allowed')")),/row-level security/);
 const result=await withRole(db,'authenticated',USER,d=>d.query('update public.categories set is_visible=false where id=$1 returning id',[C]));assert.equal(result.rows.length,0);
});
test('changing slug records history, keeps current target, reserves old URL from reuse',async()=>{
 await withRole(db,'authenticated',ADMIN,async d=>{const input=values({name:'Updated',slug:'updated-category',parent_id:null});await write(d,C,input,await version(d,C),'save');assert.equal((await d.query("select category_id from public.category_slug_history where slug='test-women'")).rows[0].category_id,C);});
 await assert.rejects(withRole(db,'authenticated',ADMIN,async d=>{await write(d,C,values({slug:'updated-category',parent_id:null}),await version(d,C),'save');await write(d,randomUUID(),values({slug:'test-women'}));}),/reserved category slug/);
});
test('self and descendant parenting are rejected inside PostgreSQL',async()=>{
 await assert.rejects(withRole(db,'authenticated',ADMIN,d=>write(d,C,values({slug:'test-women',parent_id:C}),null,'save')),/category changed/);
 await assert.rejects(withRole(db,'authenticated',ADMIN,async d=>write(d,C,values({slug:'test-women',parent_id:C}),await version(d,C),'save')),/invalid parent/);
 await assert.rejects(withRole(db,'authenticated',ADMIN,async d=>write(d,C,values({slug:'test-women',parent_id:CHILD}),await version(d,C),'save')),/category cycle/);
});
test('stale versions and changed payload reused under same request are rejected',async()=>{
 await assert.rejects(withRole(db,'authenticated',ADMIN,d=>write(d,C,values(),new Date(0).toISOString(),'save')),/category changed/);
 await assert.rejects(withRole(db,'authenticated',ADMIN,async d=>{const id=randomUUID(),request=randomUUID();await write(d,id,values(),null,'create',request);await write(d,id,values({name:'different'}),null,'create',request);}),/request reused/);
});
test('archive preserves products/category relationships and restore starts hidden',async()=>withRole(db,'authenticated',ADMIN,async d=>{
 const before=(await d.query('select count(*)::int n from public.product_categories')).rows[0].n;
 await write(d,C,{},await version(d,C),'archive');assert.equal((await d.query('select private.category_is_public($1) visible',[CHILD])).rows[0].visible,false);
 assert.equal((await d.query('select count(*)::int n from public.product_categories')).rows[0].n,before);
 assert.equal((await d.query('select count(*)::int n from public.products')).rows[0].n,2);
 await write(d,C,{},await version(d,C),'restore');const row=(await d.query('select is_visible,archived_at from public.categories where id=$1',[C])).rows[0];assert.equal(row.archived_at,null);assert.equal(row.is_visible,false);
}));
test('hidden ancestry also hides slug history and category Storage objects from visitors',async()=>{
 await db.exec('begin');try{
  const path=`categories/${CHILD}/${randomUUID()}.jpg`;await db.query('update public.categories set image_path=$1,slug=$2 where id=$3',[path,'renamed-jeans',CHILD]);await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['store-media',path]);await db.query('update public.categories set is_visible=false where id=$1',[C]);
  await db.exec('set local role anon');assert.equal((await db.query('select * from public.category_slug_history')).rows.length,0);assert.equal((await db.query('select * from storage.objects where name=$1',[path])).rows.length,0);
 }finally{await db.exec('rollback');}
});
