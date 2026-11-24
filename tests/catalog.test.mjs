import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createTestDatabase,withRole} from './helpers/database.mjs';
import {parseFilters,priceMinor,filterUrl} from '../src/lib/catalog/params.ts';
let db;const P='20000000-0000-4000-8000-000000000001',P2='20000000-0000-4000-8000-000000000002',C='10000000-0000-4000-8000-000000000001';
before(async()=>{db=await createTestDatabase();await db.exec(`update public.products set status='published',published_at=now();
insert into public.product_variants(product_id,sku,size,color,stock,is_active) values ('${P}','TEST-WHITE-30','30','Білий',5,true),('${P2}','TEST-WHITE-28','28','Білий',5,true);`);});
after(async()=>db?.close());
const search=(args=[])=>withRole(db,'anon',null,async d=>(await d.query(`select public.catalog_search(${args.join(',')}) as data`)).rows[0].data);
test('catalog RPC applies combined filters to the SAME active variant',async()=>{
  const r=await search(["sizes=>array['28']","colors=>array['Білий']","in_stock=>true"]);assert.equal(r.total,1);assert.equal(r.items[0].id,P2);
  const c=await search([`category_id=>'${C}'`,"sizes=>array['28']","colors=>array['Білий']","min_price=>100000"]);assert.equal(c.total,0);
});
test('SQL sorting, exact totals and pagination remain deterministic',async()=>{
  const first=await search(["sort_order=>'price-asc'",'page_size=>1']);assert.equal(first.total,2);assert.equal(first.items[0].id,P2);
  const second=await search(["sort_order=>'price-asc'",'page_size=>1','page_number=>2']);assert.equal(second.items[0].id,P);
  assert.equal((await search(["sort_order=>'price-desc'"])).items[0].id,P);
  assert.equal((await search(["query_text=>'%' "])).total,0);
});
test('catalog totals/items/facets do not bypass RLS when category ancestry is hidden',async()=>{
 await db.exec('begin');try{await db.query('update public.categories set is_visible=false where id=$1',[C]);await db.exec('set local role anon');const r=(await db.query('select public.catalog_search() data')).rows[0].data;assert.equal(r.total,0);assert.deepEqual(r.items,[]);assert.deepEqual(r.sizes,[]);}finally{await db.exec('rollback');}
 assert.equal((await db.query("select prosecdef from pg_proc where oid='public.catalog_search(text,uuid,text[],text[],integer,integer,boolean,text,integer,integer,boolean,boolean)'::regprocedure")).rows[0].prosecdef,false);
});
test('filter input is bounded, money is exact and pagination preserves repeated URL fields',()=>{
 const f=parseFilters({size:['28','30','28'],color:'Білий',min:'1499.01',page:'-1',sort:'DROP TABLE',q:' x '});assert.equal(priceMinor(f.min),149901);assert.equal(f.page,1);assert.equal(f.sort,'newest');assert.deepEqual(f.sizes,['28','30']);const u=new URL(filterUrl('/catalog',f,2),'http://example.test');assert.deepEqual(u.searchParams.getAll('size'),['28','30']);assert.equal(u.searchParams.get('page'),'2');assert.equal(parseFilters({min:'NaN'}).min,'');
});
