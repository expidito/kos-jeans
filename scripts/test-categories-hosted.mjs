// Disposable category-only fixtures; existing assortment and roles are untouched.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {devContext} from './catalog-dev-fixtures.mjs';
import {getSupabaseConfig} from '../src/lib/supabase/config.ts';
const base='http://127.0.0.1:3009',parent=randomUUID(),child=randomUUID(),image=randomUUID();
const prefix='test-category-check-'+randomUUID(),path=`categories/${child}/${image}.jpg`;
let ctx,userId,stage='dev target',failed=false;const checks=[];const record=check=>{checks.push({check,status:'pass'});console.log('PASS: '+check);};
const get=url=>fetch(base+url,{redirect:'manual'});
try{
 assert(process.argv.includes('--dev-only'));ctx=await devContext();
 const baseline=await ctx.sql('select count(*)::int products from public.products;');
 stage='disposable category fixture';
 await ctx.sql(`insert into public.categories(id,name,slug,is_visible) values('${parent}','ТЕСТ · Перевірка батька','${prefix}',true);insert into public.categories(id,parent_id,name,slug,is_visible,image_path) values('${child}','${parent}','ТЕСТ · Перевірка фото','${prefix}-child',true,'${path}');`);
 assert(!(await ctx.admin.storage.from('store-media').upload(path,await readFile('public/images/storefront/straight.jpg'),{contentType:'image/jpeg',upsert:false})).error);
 stage='public image and page';let res=await get('/catalog/'+prefix+'-child');assert.equal(res.status,200);assert((await res.text()).includes('ТЕСТ · Перевірка фото'));
 res=await get('/category-media/'+child);assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/image\/jpeg/);assert.match(res.headers.get('cache-control'),/no-store/);record('Published category page and protected private-bucket image load anonymously');
 stage='ordinary user access';const {url,key}=getSupabaseConfig(),password=randomBytes(36).toString('base64url'),email=`${prefix}@example.com`;
 const created=await ctx.admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{role:'admin'}});assert(!created.error&&created.data.user);userId=created.data.user.id;
 const ordinary=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});assert(!(await ordinary.auth.signInWithPassword({email,password})).error);
 const args={p_request_id:randomUUID(),p_category_id:child,p_values:{},p_command:'archive'};
 assert((await ordinary.rpc('admin_category_write',args)).error);assert((await ctx.visitor.rpc('admin_category_write',args)).error);
 const updated=await ordinary.from('categories').update({name:'Forbidden',is_visible:false}).eq('id',child).select('id');assert(!updated.data?.length);
 const deleted=await ordinary.from('categories').delete().eq('id',child).select('id');assert(!deleted.data?.length);
 const inserted=await ordinary.from('categories').insert({name:'Forbidden',slug:prefix+'-forbidden'});assert(inserted.error);
 assert((await ordinary.storage.from('store-media').upload(`categories/${child}/${randomUUID()}.jpg`,new Uint8Array([255,216,255]),{contentType:'image/jpeg'})).error);
 assert.equal((await ctx.visitor.from('categories').select('name').eq('id',child).single()).data?.name,'ТЕСТ · Перевірка фото');record('Anonymous/ordinary cannot invoke writer, insert/update/delete categories or upload photos; metadata does not grant role');
 stage='slug redirect';await ctx.sql(`update public.categories set slug='${prefix}-renamed' where id='${child}';`);
 res=await get('/catalog/'+prefix+'-child?q=denim&size=M');assert.equal(res.status,308);assert(res.headers.get('location')?.includes(prefix+'-renamed?q=denim&size=M'));record('Old category URL redirects 308 to current slug and preserves query');
 stage='hidden parent';await ctx.sql(`update public.categories set is_visible=false where id='${parent}';`);
 for(const resource of ['/catalog/'+prefix+'-renamed','/catalog/'+prefix+'-child','/category-media/'+child])assert.equal((await get(resource)).status,404);
 assert.equal((await ctx.visitor.from('categories').select('id').eq('id',child)).data?.length,0);
 assert.equal((await ctx.visitor.storage.from('store-media').download(path)).data,null);record('Hiding parent closes child/current URL/old URL and private Storage image immediately');
 stage='detach photo';await ctx.sql(`update public.categories set is_visible=true where id='${parent}';update public.categories set image_path=null where id='${child}';`);
 assert.equal((await get('/category-media/'+child)).status,404);assert.equal((await ctx.visitor.storage.from('store-media').download(path)).data,null);record('Detached photo is no longer publicly downloadable; object stays private');
 stage='private HTTP';for(const resource of ['/admin/categories','/admin/categories/new','/admin/categories/'+child]){res=await get(resource);assert([303,307].includes(res.status));assert.match(res.headers.get('cache-control'),/private.*no-store/);assert(!(await res.text()).includes('ТЕСТ · Перевірка фото'));}
 assert.equal((await get('/admin/category-media/'+child)).status,404);record('Anonymous admin routes redirect without category HTML; admin image route returns 404');
 assert.equal((await ctx.sql('select count(*)::int products from public.products;'))[0].products,baseline[0].products);record('Existing product assortment count unchanged');
}catch{failed=true;console.error('Hosted categories check failed at '+stage+'; credential-bearing details withheld');}
finally{
 if(ctx){try{await ctx.sql(`update public.categories set is_visible=false,archived_at=coalesce(archived_at,now()) where id in ('${parent}','${child}');`);}catch{failed=true;console.error('Disposable category archive failed');}}
 if(ctx&&userId){const result=await ctx.admin.auth.admin.deleteUser(userId);if(result.error){failed=true;console.error('Temporary ordinary account cleanup failed');}else record('Temporary ordinary Auth account removed; only new disposable categories archived');}
 await writeFile('docs/checks/block09-hosted.json',JSON.stringify({checks,status:failed?'failed':'pass',existingAssortmentRemoved:false,permanentRolesChanged:false},null,2)+'\n');if(failed)process.exitCode=1;
}
