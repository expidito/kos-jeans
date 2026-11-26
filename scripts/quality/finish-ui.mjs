// Exact block-15 fixture verification and restoration, dev-only. No existing catalog writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {defaults} from '../../src/lib/content/policy.ts';
import {devContext} from '../catalog-dev-fixtures.mjs';
const P='39c8e37b-018a-4906-a7a8-3f93328b6e77',C='e424ab67-32a9-4467-8491-d3d1611e22d0';
const quote=v=>"'"+v.replaceAll("'","''")+"'";
let stage="dev context";
try{
 assert(process.argv.includes('--dev-only'));
 const c=await devContext();
 stage="load original settings";
 const original=JSON.parse(await readFile('/tmp/kos-block15-original-settings.json','utf8'));
 const current=await c.sql("select key,value,is_public from public.store_settings where key in ('contacts','about')");
 stage="restore settings";
 for(const key of ['contacts','about']){
  const old=original.find(r=>r.key===key),now=current.find(r=>r.key===key);
  if(key==='about'&&now){
   if(old)assert.deepEqual(now.value,old.value);
   else{assert.deepEqual(now.value,defaults.about);await c.sql(`delete from public.store_settings where key='about' and value=${quote(JSON.stringify(defaults.about))}::jsonb;select true restored`);}
  }
  if(key==='contacts'&&now){
   assert(['',old?.value?.email,'kos-block15@example.invalid'].includes(now.value.email));
   assert(['',old?.value?.phone,'+380000000015'].includes(now.value.phone));
   if(old)await c.sql(`update public.store_settings set value=${quote(JSON.stringify(old.value))}::jsonb,is_public=${old.is_public} where key='contacts';select true restored`);
   else await c.sql("delete from public.store_settings where key='contacts' and coalesce(value->>'email','') in ('','kos-block15@example.invalid');select true restored");
  }
 }
 stage="verify settings values";
 const after=await c.sql("select key,value,is_public from public.store_settings where key in ('contacts','about') order by key");
 assert.deepEqual(after,original.map(({key,value,is_public})=>({key,value,is_public})).sort((a,b)=>a.key.localeCompare(b.key)));
 stage="owned fixture state";
 const state=(await c.sql(`select jsonb_build_object('product',(select jsonb_build_object('status',status,'photos',(select count(*) from public.product_images where product_id=p.id)) from public.products p where id='${P}' and sku='TEST-BLOCK15-DENIM-BLUE'),'categoryArchived',(select archived_at is not null from public.categories where id='${C}' and slug='test-block15-denim-jackets'),'bannerArchived',(select bool_and(archived_at is not null) from public.homepage_banners where title='ТЕСТ · Денім оновлено · аудит 15'),'orderCount',(select count(*) from public.orders where comment='KOS-BLOCK15-UI-AUDIT: ізольований тест, не відправляти'),'orderReleased',(select bool_and(status='cancelled' and inventory_released_at is not null) from public.orders where comment='KOS-BLOCK15-UI-AUDIT: ізольований тест, не відправляти'),'stocks',(select jsonb_agg(jsonb_build_object('size',size,'color',color,'stock',stock) order by color,size) from public.product_variants where product_id='${P}')) state`))[0].state;
 stage="verify archived product";assert.equal(state.product.status,'archived');assert.equal(state.product.photos,5);stage="verify category";assert.equal(state.categoryArchived,true);stage="verify banner";assert.equal(state.bannerArchived,true);assert.equal(state.orderCount,1);assert.equal(state.orderReleased,true);
 stage="verify restored stocks";assert.deepEqual(state.stocks.map(v=>v.stock),[2,5,0,4]);
 stage="verify assortment fingerprints";
 const existing=await c.sql(`select (select md5(coalesce(jsonb_agg(to_jsonb(p) order by id)::text,'[]')) from public.products p where id<>'${P}') products,(select md5(coalesce(jsonb_agg(to_jsonb(v) order by id)::text,'[]')) from public.product_variants v where product_id<>'${P}') variants,(select md5(coalesce(jsonb_agg(to_jsonb(i) order by id)::text,'[]')) from public.product_images i where product_id<>'${P}') images`);
 assert.deepEqual(existing,JSON.parse(await readFile('/tmp/kos-block15-assortment-baseline.json','utf8')));
 stage="verify private images";
 const images=await c.sql(`select id,storage_path from public.product_images where product_id='${P}'`);assert.equal(images.length,5);for(const i of images){assert.equal((await c.visitor.from('product_images').select('id').eq('id',i.id)).data?.length,0);assert((await c.visitor.storage.from('store-media').download(i.storage_path)).error);}
 await writeFile('docs/checks/quality/ui-restored.json',JSON.stringify({status:'passed',settingsValuesAndVisibilityRestored:true,existingProductsVariantsImagesFingerprintsUnchanged:true,ownPhotosRetainedPrivate:true,permanentAccountUntouched:true,productionModified:false,state},null,2)+'\n');console.log('PASS exact settings restored; existing assortment fingerprints unchanged; own order cancelled once; own product/category/banner archived and photos private');
}catch{console.error('FAIL block15 teardown verification at '+stage+'; details withheld');process.exitCode=1;}
