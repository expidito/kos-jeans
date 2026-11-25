// Verifies dev RLS and application boundaries; never grants an administrator role.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {devContext} from './catalog-dev-fixtures.mjs';
import {getSupabaseConfig} from '../src/lib/supabase/config.ts';
const base=process.env.PRODUCTS_TEST_BASE??'http://127.0.0.1:3010';let ctx,userId,stage='dev authorization',failed=false;const checks=[];
const record=check=>{checks.push({check,status:'pass'});console.log('PASS: '+check);};
try{
 assert(process.argv.includes('--dev-only'));ctx=await devContext();const {url,key}=getSupabaseConfig();
 stage='schema';assert.equal((await ctx.sql("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('admin_product_write','admin_product_upload','admin_product_cleanup','admin_product_search')"))[0].n,4);record('All four admin product RPCs exist in kos-jeans-dev');
 stage='ordinary identity';const password=randomBytes(36).toString('base64url'),email=`test-products-${randomUUID()}@example.com`;const made=await ctx.admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{role:'admin'}});assert(!made.error&&made.data.user);userId=made.data.user.id;
 const ordinary=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});assert(!(await ordinary.auth.signInWithPassword({email,password})).error);
 assert.equal((await ordinary.rpc('is_store_admin')).data,false);const product='80000000-0000-4000-8000-000000000001';
 for(const client of [ordinary,ctx.visitor]){
  assert((await client.rpc('admin_product_write',{p_request_id:randomUUID(),p_product_id:product,p_values:{},p_command:'archive'})).error);
  assert((await client.rpc('admin_product_upload',{p_product_id:product,p_image_id:randomUUID(),p_extension:'jpg',p_digest:'a'.repeat(64)})).error);
  assert((await client.rpc('admin_product_cleanup')).error);assert((await client.rpc('admin_product_search')).error);
  assert(!(await client.from('products').update({price_kopecks:1,status:'draft'}).eq('id',product).select('id')).data?.length);
  assert(!(await client.from('product_variants').update({stock:999,size:'FAKE'}).eq('product_id',product).select('id')).data?.length);
 }
 record('Anonymous and ordinary users cannot change prices/variants/stock or call admin RPCs; role metadata ignored');
 stage='private Storage';const row={data:(await ctx.sql(`select storage_path from public.product_images where product_id='${product}' limit 1`))[0]};assert(row.data);
 const removed=await ordinary.storage.from('store-media').remove([row.data.storage_path]);assert(removed.error||!removed.data?.length);stage='original photo remains';assert((await ctx.visitor.storage.from('store-media').download(row.data.storage_path)).data);
 stage='ordinary upload denied';assert((await ordinary.storage.from('store-media').upload(`products/${product}/${randomUUID()}.jpg`,new Uint8Array([255,216,255]),{contentType:'image/jpeg'})).error);
 stage='draft photo private';const hidden={data:(await ctx.sql("select id,storage_path from public.product_images where product_id='80000000-0000-4000-8000-000000000014' limit 1"))[0]};assert(hidden.data);assert(!(await ordinary.storage.from('store-media').download(hidden.data.storage_path)).data);record('Ordinary users cannot upload/delete catalog photos or read draft photos; original object remains');
 stage='HTTP boundaries';for(const path of ['/admin/products','/admin/products/new','/admin/products/'+product]){const r=await fetch(base+path,{redirect:'manual'});assert([303,307].includes(r.status));assert.match(r.headers.get('cache-control'),/private.*no-store/);assert(!(await r.text()).includes('TEST-CATALOG-1'));}
 assert.equal((await fetch(base+'/admin/product-media/'+hidden.data.id)).status,404);assert.equal((await fetch(base+'/media/'+hidden.data.id)).status,404);
 for(const endpoint of ['save','upload']){const r=await fetch(base+'/admin/products/api/'+endpoint,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}',redirect:'manual'});assert([401,403].includes(r.status));const cross=await fetch(base+'/admin/products/api/'+endpoint,{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}',redirect:'manual'});assert.equal(cross.status,403);}
 record('Private HTTP routes redirect; anonymous mutation and cross-origin POST denied; draft media 404');
}catch{failed=true;console.error('Hosted products check failed at '+stage+'; credential-bearing details withheld');}
finally{if(ctx&&userId){const r=await ctx.admin.auth.admin.deleteUser(userId);if(r.error)failed=true;else record('Temporary ordinary Auth account removed; permanent roles and catalog untouched');}await writeFile('docs/checks/block10-hosted.json',JSON.stringify({checks,status:failed?'failed':'pass',productionModified:false,permanentRolesChanged:false},null,2)+'\n');if(failed)process.exitCode=1;}
