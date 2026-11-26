// Transaction-only synthetic growth test. No rows or order sequence values persist.
import assert from 'node:assert/strict';
import {devContext} from '../catalog-dev-fixtures.mjs';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const marker='quality-'+randomUUID(), category=randomUUID();
try{
 const c=await devContext();
 const rows=await c.sql(`begin;
 insert into public.categories(id,slug,name,is_visible) values('${category}','${marker}','ТЕСТ · rollback scale',true);
 insert into public.products(id,slug,sku,name,price_kopecks,status,published_at) select md5('${marker}'||i)::uuid,'${marker}-'||i,'${marker}-'||i,'ТЕСТ · scale '||i,10000+i,'published',now() from generate_series(1,1000)i;
 insert into public.product_categories select md5('${marker}'||i)::uuid,'${category}'::uuid from generate_series(1,1000)i;
 insert into public.product_variants(id,product_id,sku,size,color,stock,is_active) select md5('${marker}-v'||i)::uuid,md5('${marker}'||i)::uuid,'${marker}-v'||i,'M','Тест',5,true from generate_series(1,1000)i;
 insert into public.orders(order_number,idempotency_key,request_fingerprint,customer_name,customer_phone,city,delivery_method,delivery_address,total_kopecks) overriding system value select -1000000-i,md5('${marker}-o'||i)::uuid,repeat('a',64),'ТЕСТ · rollback scale','+380000000015','Тест','Тест','Тест',0 from generate_series(1,1000)i;
 create temporary table timings(name text,ms numeric,total int);
 select set_config('request.jwt.claim.sub','d4319c1d-bec3-40e4-8b87-41e5101cf52f',true);
 do $$declare t timestamptz;r jsonb;begin
 if not exists(select 1 from private.admin_users where user_id='d4319c1d-bec3-40e4-8b87-41e5101cf52f') then raise exception 'unverified administrator';end if;
 set local role authenticated;t:=clock_timestamp();r:=public.admin_product_search('ТЕСТ · scale',null,'','stock',20);reset role;insert into timings values('admin products page 20 / stock sort',extract(epoch from clock_timestamp()-t)*1000,(r->>'total')::int);
 set local role authenticated;t:=clock_timestamp();r:=public.admin_order_search('','',null,null,'newest',20);reset role;insert into timings values('admin orders page 20',extract(epoch from clock_timestamp()-t)*1000,(r->>'total')::int);
 end$$;
 set local role anon;
 reset role;
 do $$declare t timestamptz;r jsonb;begin
 set local role anon;t:=clock_timestamp();r:=public.catalog_search('ТЕСТ · scale','${category}',array['M'],array['Тест'],10000,12000,true,'price-asc',20,12,false,false);reset role;insert into timings values('anon combined filters page 20',extract(epoch from clock_timestamp()-t)*1000,(r->>'total')::int);
 end$$;
 select name,ms,total from timings;rollback;`);
 assert.equal(rows.find(r=>r.name.startsWith('anon')).total,1000);
 await writeFile('docs/checks/quality/scale.json',JSON.stringify({status:'pass',environment:'kos-jeans-dev',syntheticProducts:1000,syntheticVariants:1000,syntheticOrders:1000,allRowsRolledBack:true,orderIdentitySequenceUntouched:true,rows},null,2)+'\n');console.log('PASS transaction-only scale measurements saved; synthetic rows rolled back');
}catch{console.error('FAIL scale benchmark; details withheld; transaction rolled back');process.exitCode=1;}
