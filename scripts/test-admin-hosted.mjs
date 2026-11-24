// Dev-only negative security checks. No permanent administrator is created.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createServerClient} from '@supabase/ssr';
import {getSupabaseConfig} from '../src/lib/supabase/config.ts';
import {devContext} from './catalog-dev-fixtures.mjs';
const checks=[];const record=check=>{checks.push({check,status:'pass'});console.log(`PASS: ${check}`);};
let ctx,userId;let stage='initialize';let failure=false;
const base='http://127.0.0.1:3008';
const get=(path,cookie='')=>fetch(base+path,{redirect:'manual',headers:cookie?{cookie}:undefined});
const post=(path,fields,origin=base)=>fetch(base+path,{method:'POST',redirect:'manual',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields)});
try{
 assert(process.argv.includes('--dev-only'));ctx=await devContext();
 stage='public paths and private cache policy';
 for(const path of ['/admin','/admin/products','/admin/products/new','/admin/categories','/admin/orders','/admin/banners','/admin/settings']){
  const res=await get(path);assert([303,307].includes(res.status));assert(res.headers.get('location')?.includes('/admin/login'));assert.match(res.headers.get('cache-control')??'',/private.*no-store/);
  const html=await res.text();assert(!html.includes('TEST-CATALOG-V'));assert(!html.includes('Усього товарів'));
 }
 const login=await get('/admin/login');assert.equal(login.status,200);const loginHtml=await login.text();assert(loginHtml.includes('current-password'));assert(loginHtml.includes('noindex'));record('All private URLs redirect anonymous visitors, no dashboard data and private/no-store');
 stage='CSRF and malformed forms';
 for(const path of ['/admin/auth/login','/admin/auth/logout']){const res=await post(path,{},'https://untrusted.example');assert.equal(res.status,403);}
 const malformed=await post('/admin/auth/login',{email:'not-email',password:'x'});assert(malformed.headers.get('location')?.endsWith('error=credentials'));record('Login/logout reject cross-origin requests; malformed credentials rejected');
 stage='ordinary temporary Auth identity';
 const email=`block08-check-${randomUUID()}@example.com`,password=randomBytes(36).toString('base64url');
 const created=await ctx.admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{role:'admin',is_admin:true}});assert(!created.error&&created.data.user);userId=created.data.user.id;
 const invalid=await post('/admin/auth/login',{email,password:randomBytes(36).toString('base64url')});assert(invalid.headers.get('location')?.endsWith('error=credentials'));record('Incorrect password rejected with generic message');
 const ordinary=await post('/admin/auth/login',{email,password});assert(ordinary.headers.get('location')?.endsWith('error=forbidden'));record('Valid ordinary account cannot login as admin, metadata role ignored');
 assert(ordinary.headers.getSetCookie().length>0);
 assert(ordinary.headers.getSetCookie().every(c=>/HttpOnly/i.test(c)&&/SameSite=lax/i.test(c)));
 let values=[];const {url,key}=getSupabaseConfig();
 const client=createServerClient(url,key,{cookies:{getAll:()=>values,setAll:changes=>{for(const c of changes){values=values.filter(v=>v.name!==c.name);if(c.value)values.push({name:c.name,value:c.value});}}}});
 assert(!(await client.auth.signInWithPassword({email,password})).error);
 assert.equal((await client.rpc('is_store_admin')).data,false);
 const cookie=values.map(v=>`${v.name}=${v.value}`).join('; ');
 const direct=await get('/admin/orders',cookie);assert([303,307].includes(direct.status));assert(direct.headers.get('location')?.includes('error=forbidden'));
 const role=await client.schema('private').from('admin_users').insert({user_id:userId});assert(role.error);
 const draft=await client.from('products').select('id').eq('status','draft');assert.equal(draft.data?.length,0);
 const orders=await client.from('orders').select('id');assert.equal(orders.data?.length,0);
 record('Direct ordinary session, forged metadata and private role write cannot bypass server/RLS');
 stage='expired local session metadata with refresh';
 const session=(await client.auth.getSession()).data.session;assert(session);
 const cookieName=values[0].name.replace(/\.\d+$/,'');
 const staleCookie=`${cookieName}=base64-${Buffer.from(JSON.stringify({...session,expires_at:1})).toString('base64url')}`;
 const refreshed=await get('/admin',staleCookie);assert(refreshed.headers.get('location')?.includes('error=forbidden'));assert(refreshed.headers.getSetCookie().length>0);
 assert(!(await ctx.admin.auth.admin.signOut(session.access_token,'local')).error);
 const expired=await get('/admin',staleCookie);assert(expired.headers.get('location')?.includes('error=session'));
 record('Stale session refreshes without elevating ordinary role; revoked refresh returns to login');
 stage='invalid cookie and logout';
 const tampered=await get('/admin',cookie.replace(/=base64-/, '=base64-tampered'));
 assert([303,307].includes(tampered.status));
 const logout=await fetch(base+'/admin/auth/logout',{method:'POST',redirect:'manual',headers:{origin:base,cookie}});assert(logout.headers.get('location')?.endsWith('notice=logout'));
 assert(logout.headers.getSetCookie().some(c=>c.includes('Max-Age=0')));
 assert([303,307].includes((await get('/admin')).status));
 record('Tampered session rejected; logout clears session cookies and private access stays closed');
 stage='public regression';
 const catalog=await get('/catalog');assert.equal(catalog.status,200);assert((await catalog.text()).includes('ТЕСТ'));
 const product=await get('/product/test-catalog-1');assert.equal(product.status,200);assert((await product.text()).includes('TEST-CATALOG-1'));record('Public catalog and product remain available with anonymous RLS');
} catch { failure=true;console.error(`Admin hosted check failed at ${stage}; credential-bearing details withheld`); }
finally{
 if(userId&&ctx){const result=await ctx.admin.auth.admin.deleteUser(userId);if(result.error){failure=true;console.error('Temporary ordinary user cleanup failed; no identifier or credentials printed');}else record('Only the temporary ordinary test account was removed; no administrator assigned');}
 await writeFile('docs/checks/block08-hosted.json',JSON.stringify({checks,status:failure?'failed':'pass',permanentAdminAssigned:false,adminSuccessRequiresOwnerLogin:true},null,2)+'\n');
 if(failure)process.exitCode=1;
}
