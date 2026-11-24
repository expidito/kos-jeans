import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {devContext,fixtureId} from './catalog-dev-fixtures.mjs';
const checks=[];let stage='dev authorization';let ctx;const P=fixtureId('8',1),C=fixtureId('7',6),I=fixtureId('a',1);
const base='http://127.0.0.1:3005';
const record=label=>{checks.push({check:label,status:'pass'});console.log('PASS: '+label);};
let failure=false;
try{
 assert(process.argv.includes('--dev-only'));ctx=await devContext();
 const search=async args=>{const r=await ctx.visitor.rpc('catalog_search',args);assert(!r.error);return r.data;};
 stage='published catalog';const all=await search({});assert.equal(all.total,13);assert.equal(all.items.length,12);assert(!all.items.some(p=>p.id===fixtureId('8',14)||p.id===fixtureId('8',15)||p.id===fixtureId('8',16)));record('Published catalog excludes drafts, archives and hidden ancestry');
 stage='combined filters';const filtered=await search({category_id:fixtureId('7',1),sizes:['28'],colors:['Білий'],in_stock:true,min_price:200000,max_price:300000,query_text:'Relaxed'});assert.equal(filtered.total,1);assert.equal(filtered.items[0].id,fixtureId('8',2));record('Search/category/size/color/price/stock work together on one variant');
 stage='sort and pages';const asc=await search({sort_order:'price-asc'}),desc=await search({sort_order:'price-desc'}),page2=await search({page_number:2});assert(asc.items.every((p,i,a)=>!i||a[i-1].price_kopecks<=p.price_kopecks));assert(desc.items.every((p,i,a)=>!i||a[i-1].price_kopecks>=p.price_kopecks));assert.equal(page2.items.length,1);assert(!all.items.some(p=>p.id===page2.items[0].id));assert.equal(all.items[0].id,P);record('Price/newest sorting and pagination use real database rows');
 stage='public HTTP and media';for(const path of ['/catalog','/catalog/test-jeans'])assert.equal((await fetch(base+path)).status,200);assert.equal((await fetch(base+'/catalog/test-hidden-child')).status,404);assert.equal((await fetch(base+'/catalog/missing-category')).status,404);
 const image=await fetch(base+'/media/'+I);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/^image\//);assert.match(image.headers.get('cache-control'),/no-store/);assert.equal((await fetch(base+'/media/'+fixtureId('a',14))).status,404);record('Public category/images load; hidden/missing categories and draft images return 404');
 stage='live price';await ctx.sql(`update public.products set price_kopecks=150000 where id='${P}';select true as changed;`);const html=await(await fetch(base+'/catalog?q='+encodeURIComponent('Straight 1'))).text();const card=html.match(new RegExp(`data-product="${P}"[\\s\\S]*?</article>`))?.[0];assert(card?.includes('1 500 ₴'));record('Price change appears in server HTML without deployment');
 stage='live categories';await ctx.sql(`insert into public.categories(id,parent_id,slug,name,is_visible) values('${C}','${fixtureId('7',1)}','test-runtime-category','ТЕСТ · Нова категорія',true);select true as created;`);const home=await(await fetch(base+'/')).text();assert(home.includes('ТЕСТ · Нова категорія'));assert.equal((await fetch(base+'/catalog/test-runtime-category')).status,200);record('New database category appears in public navigation without deployment');
 stage='empty state';const empty=await(await fetch(base+'/catalog?q=NONEXISTENT123')).text();assert(empty.includes('Товари ще готуються.'));record('No-match catalog has a real empty state');
}catch{failure=true;console.error('FAIL: '+stage+'; credential-bearing details withheld');}
finally{if(ctx){try{await ctx.sql(`begin;update public.products set price_kopecks=149900 where id='${P}';delete from public.categories where id='${C}';commit;select true as restored;`);record('Temporary price/category changes restored; only marked dev fixtures remain');}catch{failure=true;console.error('FAIL: restoring test changes; details withheld');}}
await mkdir('docs/checks',{recursive:true});await writeFile('docs/checks/block06-hosted.json',JSON.stringify({executedAt:new Date().toISOString(),environment:'kos-jeans-dev',status:failure?'failed':'passed',checks},null,2)+'\n');}
if(failure)process.exitCode=1;
