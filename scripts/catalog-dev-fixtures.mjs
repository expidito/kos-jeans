import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/lib/supabase/config.ts';
export const fixtureId=(kind,n)=>`${kind}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const cli=args=>JSON.parse(execFileSync('npx',['--yes','supabase@3.3.0',...args,'--output-format','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
export async function devContext(){const {url,key}=getSupabaseConfig();const ref=new URL(url).hostname.split('.')[0];if(!cli(['projects','list']).projects.some(p=>(p.ref===ref||p.id===ref)&&p.name==='kos-jeans-dev'))throw Error('Dev target required');
  const keys=cli(['projects','api-keys',`--remote=${ref}`,'--reveal']).keys;const secret=keys.find(k=>k.api_key?.startsWith('sb_secret_'))?.api_key??keys.find(k=>k.name==='service_role')?.api_key;if(!secret)throw Error('CLI authorization required');
  const sql=async query=>{const dir=await mkdtemp(join(tmpdir(),'kos-catalog-sql-'));try{const file=join(dir,'query.sql');await writeFile(file,query,{mode:0o600});return cli(['db','query',`--remote=${ref}`,'--file',file,'--yes']).rows;}finally{await rm(dir,{recursive:true,force:true});}};
  const opts={auth:{persistSession:false,autoRefreshToken:false}};return {sql,url,visitor:createClient(url,key,opts),admin:createClient(url,secret,opts)};
}
export async function seedCatalog(ctx){
  const C=n=>fixtureId('7',n),P=n=>fixtureId('8',n),V=n=>fixtureId('9',n),I=n=>fixtureId('a',n);
  await ctx.sql(`begin;
    insert into public.categories(id,slug,name,is_visible,sort_order) values
      ('${C(1)}','test-women','ТЕСТ · Жінкам',true,10),('${C(2)}','test-men','ТЕСТ · Чоловікам',true,20),('${C(3)}','test-hidden','ТЕСТ · Прихована',false,30)
      on conflict(id) do nothing;
    insert into public.categories(id,parent_id,slug,name,is_visible) values
      ('${C(4)}','${C(1)}','test-jeans','ТЕСТ · Джинси',true),('${C(5)}','${C(3)}','test-hidden-child','ТЕСТ · Прихована гілка',true)
      on conflict(id) do nothing;
    ${Array.from({length:16},(_,j)=>{const n=j+1;return `
    insert into public.products(id,slug,sku,name,description,price_kopecks,old_price_kopecks,status,published_at,is_new,is_featured)
      values ('${P(n)}','test-catalog-${n}','TEST-CATALOG-${n}','ТЕСТ · ${n%3===0?'Куртка Denim':n%3===1?'Джинси Straight':'Джинси Relaxed'} ${n}',
      'Тестовий товар dev-середовища. Фотоілюстрація з Unsplash; не продається.',${n===1?149900:n===2?249900:100000+n*1000},${n===2?299900:'null'},'${n===14?'draft':n===15?'archived':'published'}',now()-interval '${n} day',${n<4},${n<5}) on conflict(id) do nothing;
    insert into public.product_categories values('${P(n)}','${n===16?C(5):n%3===0?C(2):C(4)}') on conflict do nothing;
    insert into public.product_variants(id,product_id,sku,size,color,stock,is_active)
      values('${V(n)}','${P(n)}','TEST-CATALOG-V${n}','${n<3?'28':'M'}','${n===2?'Білий':'Синій'}',${n===1||n===13?0:5},true) on conflict(id) do nothing;
    insert into public.product_images(id,product_id,storage_path,is_primary,alt_text)
      values('${I(n)}','${P(n)}','products/${P(n)}/${I(n)}.jpg',true,'Тестова фотоілюстрація, не реальний асортимент') on conflict(id) do nothing;`;}).join('\n')}
    insert into public.product_variants(id,product_id,sku,size,color,stock,is_active) values('${V(100)}','${P(1)}','TEST-CATALOG-V100','30','Білий',5,true) on conflict(id) do nothing;
    commit; select true as ready;`);
  for(let n=1;n<=16;n++){const data=await readFile(`public/images/storefront/${n%3===0?'men':n%3===1?'straight':'women'}.jpg`);const {error}=await ctx.admin.storage.from('store-media').upload(`products/${P(n)}/${I(n)}.jpg`,data,{contentType:'image/jpeg',upsert:true,cacheControl:'0'});if(error)throw Error('Fixture image upload failed');}
}
export async function cleanupCatalog(ctx){
  const paths=Array.from({length:16},(_,j)=>`products/${fixtureId('8',j+1)}/${fixtureId('a',j+1)}.jpg`);
  if((await ctx.admin.storage.from('store-media').remove(paths)).error)throw Error('Fixture cleanup failed');
  await ctx.sql(`begin;delete from public.products where id in (${Array.from({length:16},(_,j)=>`'${fixtureId('8',j+1)}'`).join(',')});delete from public.categories where id in ('${fixtureId('7',4)}','${fixtureId('7',5)}');delete from public.categories where id in ('${fixtureId('7',1)}','${fixtureId('7',2)}','${fixtureId('7',3)}');commit;select true as removed;`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{if(!process.argv.includes('--dev-only'))throw Error('Dev flag required');const ctx=await devContext();if(process.argv.includes('--cleanup'))await cleanupCatalog(ctx);else await seedCatalog(ctx);console.log('Dev-only catalog fixtures: '+(process.argv.includes('--cleanup')?'removed':'ready, all products explicitly marked TEST'));}catch{console.error('Dev fixture operation failed; credential-bearing details withheld');process.exitCode=1;}
}
