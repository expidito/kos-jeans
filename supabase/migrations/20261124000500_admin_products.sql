begin;
create table private.product_mutations (
 user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,
 product_id uuid not null references public.products(id) on delete restrict,payload jsonb not null,
 created_at timestamptz not null default now(),primary key(user_id,request_id)
);
create table private.product_uploads (
 id uuid primary key,product_id uuid not null references public.products(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete cascade,path text not null unique,
 digest text not null check(digest ~ '^[a-f0-9]{64}$'),ready boolean not null default false,
 created_at timestamptz not null default now()
);
create table private.product_media_cleanup (
 path text primary key,product_id uuid not null references public.products(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now()
);
do $$ declare t text; begin foreach t in array array['product_mutations','product_uploads','product_media_cleanup'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on private.%I to authenticated',t);
 execute format('create policy own_admin_rows on private.%I to authenticated using (user_id=(select auth.uid()) and (select private.is_admin())) with check (user_id=(select auth.uid()) and (select private.is_admin()))',t);
 end loop;end $$;

-- Changes through other trusted operations (including future checkout) invalidate
-- an editor snapshot as well. Stable variant IDs are never deleted by the editor.
create function private.touch_product_parent() returns trigger
language plpgsql set search_path='' as $$ begin
 if tg_op<>'DELETE' then update public.products set updated_at=now() where id=new.product_id;end if;
 if tg_op='DELETE' then update public.products set updated_at=now() where id=old.product_id;end if;
 return null;end $$;
revoke all on function private.touch_product_parent() from public,anon,authenticated;
create trigger variant_parent_version after insert or update or delete on public.product_variants for each row execute function private.touch_product_parent();
create trigger image_parent_version after insert or update or delete on public.product_images for each row execute function private.touch_product_parent();
create trigger category_product_version after insert or update or delete on public.product_categories for each row execute function private.touch_product_parent();

alter table public.product_variants drop constraint product_variants_product_id_size_color_key;
alter table public.product_variants add constraint product_variants_product_id_size_color_key unique(product_id,size,color) deferrable initially immediate;
alter table public.product_variants drop constraint product_variants_sku_key;
alter table public.product_variants add constraint product_variants_sku_key unique(sku) deferrable initially immediate;

create function public.admin_product_upload(p_product_id uuid,p_image_id uuid,p_extension text,p_digest text,p_ready boolean default false) returns text
language plpgsql security invoker set search_path='' as $$
declare item private.product_uploads;target text;
begin
 if not private.is_admin() then raise exception 'admin required' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(52005002);
 if p_product_id is null or p_image_id is null or p_extension not in ('jpg','png','webp') or p_extension is null or p_digest is null or p_digest !~ '^[a-f0-9]{64}$'
 or not exists(select 1 from public.products where id=p_product_id) then raise exception 'invalid upload' using errcode='23514';end if;
 target:='products/'||p_product_id::text||'/'||p_image_id::text||'.'||p_extension;
 if exists(select 1 from public.product_images where id=p_image_id) or exists(select 1 from private.product_media_cleanup where path=target)
 then raise exception 'image already committed or retired' using errcode='23514';end if;
 select * into item from private.product_uploads where id=p_image_id;
 if found then
  if item.product_id<>p_product_id or item.digest<>p_digest or item.path<>target then raise exception 'upload conflict' using errcode='40001';end if;
 else
  if (select count(*) from private.product_uploads u where u.product_id=p_product_id and not exists(select 1 from public.product_images i where i.id=u.id))>=50
  then raise exception 'too many pending uploads' using errcode='23514';end if;
  insert into private.product_uploads(id,product_id,user_id,path,digest) values(p_image_id,p_product_id,auth.uid(),target,p_digest);
 end if;
 if p_ready then
  if not exists(select 1 from storage.objects where bucket_id='store-media' and name=target) then raise exception 'missing object' using errcode='23514';end if;
  update private.product_uploads set ready=true where id=p_image_id;
 end if;
 return target;
end $$;
revoke all on function public.admin_product_upload(uuid,uuid,text,text,boolean) from public,anon;
grant execute on function public.admin_product_upload(uuid,uuid,text,text,boolean) to authenticated;

create function public.admin_product_write(p_request_id uuid,p_product_id uuid,p_values jsonb,p_expected_version timestamptz default null,p_command text default 'save') returns uuid
language plpgsql security invoker set search_path='' as $$
declare prior public.products;receipt private.product_mutations;payload jsonb;v record;i record;c uuid;old_image record;
begin
 if not private.is_admin() then raise exception 'admin required' using errcode='42501';end if;
 if p_request_id is null or p_product_id is null or p_command is null or p_command not in ('reserve','save','archive') or jsonb_typeof(p_values) is distinct from 'object'
 then raise exception 'invalid product input' using errcode='23514';end if;
 perform pg_catalog.pg_advisory_xact_lock(52005002);
 payload:=jsonb_build_object('id',p_product_id,'command',p_command,'values',p_values);
 select * into receipt from private.product_mutations where user_id=auth.uid() and request_id=p_request_id;
 if found then if receipt.payload<>payload then raise exception 'request reused' using errcode='40001';end if;return receipt.product_id;end if;
 select * into prior from public.products where id=p_product_id for update;
 if p_command='reserve' then
  if found then raise exception 'product exists' using errcode='23505';end if;
 else
  if not found or p_expected_version is null or prior.updated_at<>p_expected_version then raise exception 'product changed' using errcode='40001';end if;
 end if;
 if p_command='archive' then
  update public.products set status='archived' where id=p_product_id;
 else
  if length(btrim(coalesce(p_values->>'name',''))) not between 1 and 200 or length(btrim(coalesce(p_values->>'sku',''))) not between 1 and 80
   or coalesce(p_values->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_values->>'slug')>200
   or coalesce(p_values->>'price_kopecks','') !~ '^[0-9]+$' or (p_values->>'price_kopecks')::bigint>2147483647
   or length(coalesce(p_values->>'description',''))>20000 or length(coalesce(p_values->>'material',''))>5000
   or jsonb_typeof(p_values->'characteristics') is distinct from 'object'
   or coalesce(p_values->>'status','') not in ('draft','published','archived')
  then raise exception 'invalid product fields' using errcode='23514';end if;
  if p_command='reserve' then
   insert into public.products(id,name,sku,slug,description,material,characteristics,price_kopecks,old_price_kopecks,status,is_new,is_featured)
   values(p_product_id,btrim(p_values->>'name'),btrim(p_values->>'sku'),p_values->>'slug',coalesce(p_values->>'description',''),coalesce(p_values->>'material',''),p_values->'characteristics',(p_values->>'price_kopecks')::integer,nullif(p_values->>'old_price_kopecks','')::integer,'draft',coalesce((p_values->>'is_new')::boolean,false),coalesce((p_values->>'is_featured')::boolean,false));
  else
   if jsonb_typeof(p_values->'categories') is distinct from 'array' or jsonb_array_length(p_values->'categories')>20
    or jsonb_typeof(p_values->'variants') is distinct from 'array' or jsonb_array_length(p_values->'variants')>100
    or jsonb_typeof(p_values->'images') is distinct from 'array' or jsonb_array_length(p_values->'images')>10
   then raise exception 'invalid product relationships' using errcode='23514';end if;
   if (select count(*)<>count(distinct x) from jsonb_array_elements_text(p_values->'categories') x)
    or (select count(*)<>count(distinct id) from jsonb_to_recordset(p_values->'variants') as x(id uuid))
    or (select count(*)<>count(distinct (lower(size),lower(color))) from jsonb_to_recordset(p_values->'variants') as x(size text,color text))
    or (select count(*)<>count(distinct sku) from jsonb_to_recordset(p_values->'variants') as x(sku text))
    or (select count(*)<>count(distinct id) from jsonb_to_recordset(p_values->'images') as x(id uuid))
    or ((select count(*) from jsonb_to_recordset(p_values->'images') as x(is_primary boolean) where is_primary)<>case when jsonb_array_length(p_values->'images')>0 then 1 else 0 end)
   then raise exception 'duplicate variant or invalid cover' using errcode='23514';end if;
   for c in select value::uuid from jsonb_array_elements_text(p_values->'categories') loop
    if not exists(select 1 from public.categories where id=c and archived_at is null) then raise exception 'invalid category' using errcode='23514';end if;
   end loop;
   if p_values->>'status'='published' and (length(btrim(coalesce(p_values->>'description','')))=0 or jsonb_array_length(p_values->'images')=0
    or not exists(select 1 from jsonb_to_recordset(p_values->'variants') as x(is_active boolean) where is_active)
    or not exists(select 1 from jsonb_array_elements_text(p_values->'categories') x where private.category_is_public(x.value::uuid)))
   then raise exception 'publication needs description category photos variants' using errcode='23514';end if;
   set constraints public.product_variants_sku_key,public.product_variants_product_id_size_color_key deferred;
   for v in select * from jsonb_to_recordset(p_values->'variants') as x(id uuid,sku text,size text,color text,stock integer,is_active boolean) loop
    if v.id is null or v.sku is null or v.size is null or v.color is null or v.stock is null or v.is_active is null
      or v.sku<>btrim(v.sku) or v.size<>btrim(v.size) or v.color<>btrim(v.color)
      or exists(select 1 from public.product_variants where id=v.id and product_id<>p_product_id) then raise exception 'invalid variant ownership' using errcode='23514';end if;
    if exists(select 1 from public.product_variants where id=v.id) then
     update public.product_variants set sku=v.sku,size=v.size,color=v.color,stock=v.stock,is_active=v.is_active where id=v.id and product_id=p_product_id;
    else insert into public.product_variants(id,product_id,sku,size,color,stock,is_active) values(v.id,p_product_id,v.sku,v.size,v.color,v.stock,v.is_active);end if;
   end loop;
   update public.product_variants set is_active=false where product_id=p_product_id and id not in (select id from jsonb_to_recordset(p_values->'variants') as x(id uuid));
   set constraints public.product_variants_sku_key,public.product_variants_product_id_size_color_key immediate;
   for i in select * from jsonb_to_recordset(p_values->'images') as x(id uuid,alt_text text,is_primary boolean) loop
    if i.id is null or i.is_primary is null or length(coalesce(i.alt_text,''))>500
     or not (exists(select 1 from public.product_images where id=i.id and product_id=p_product_id)
       or exists(select 1 from private.product_uploads u where u.id=i.id and u.product_id=p_product_id and u.ready and not exists(select 1 from private.product_media_cleanup j where j.path=u.path)))
    then raise exception 'invalid image ownership or upload' using errcode='23514';end if;
    if not exists(select 1 from storage.objects o where o.bucket_id='store-media' and o.name=coalesce((select storage_path from public.product_images where id=i.id and product_id=p_product_id),(select path from private.product_uploads where id=i.id and product_id=p_product_id))) then raise exception 'missing image object' using errcode='23514';end if;
   end loop;
   for old_image in select * from public.product_images where product_id=p_product_id and id not in(select id from jsonb_to_recordset(p_values->'images') as x(id uuid)) loop
    insert into private.product_media_cleanup(path,product_id,user_id) values(old_image.storage_path,p_product_id,auth.uid()) on conflict(path) do nothing;
   end loop;
   delete from public.product_images where product_id=p_product_id and id not in(select id from jsonb_to_recordset(p_values->'images') as x(id uuid));
   update public.product_images set is_primary=false where product_id=p_product_id;
   for i in select x.*,ordinality-1 position from jsonb_array_elements(p_values->'images') with ordinality a(value,ordinality),lateral jsonb_to_record(a.value) as x(id uuid,alt_text text,is_primary boolean) loop
    if exists(select 1 from public.product_images where id=i.id and product_id=p_product_id) then update public.product_images set alt_text=coalesce(i.alt_text,''),is_primary=i.is_primary,sort_order=i.position where id=i.id and product_id=p_product_id;
    else insert into public.product_images(id,product_id,storage_path,alt_text,is_primary,sort_order) select i.id,p_product_id,u.path,coalesce(i.alt_text,''),i.is_primary,i.position from private.product_uploads u where u.id=i.id and u.product_id=p_product_id;end if;
   end loop;
   delete from public.product_categories where product_id=p_product_id;
   insert into public.product_categories(product_id,category_id) select p_product_id,value::uuid from jsonb_array_elements_text(p_values->'categories');
   update public.products set name=btrim(p_values->>'name'),sku=btrim(p_values->>'sku'),slug=p_values->>'slug',description=coalesce(p_values->>'description',''),material=coalesce(p_values->>'material',''),characteristics=p_values->'characteristics',price_kopecks=(p_values->>'price_kopecks')::integer,old_price_kopecks=nullif(p_values->>'old_price_kopecks','')::integer,status=p_values->>'status',is_new=coalesce((p_values->>'is_new')::boolean,false),is_featured=coalesce((p_values->>'is_featured')::boolean,false),published_at=case when p_values->>'status'='published' then least(coalesce(prior.published_at,now()),now()) else prior.published_at end where id=p_product_id;
  end if;
 end if;
 insert into private.product_mutations(user_id,request_id,product_id,payload) values(auth.uid(),p_request_id,p_product_id,payload);
 return p_product_id;
end $$;
revoke all on function public.admin_product_write(uuid,uuid,jsonb,timestamptz,text) from public,anon;
grant execute on function public.admin_product_write(uuid,uuid,jsonb,timestamptz,text) to authenticated;

create function public.admin_product_cleanup(p_done text default null) returns setof text
language plpgsql security invoker set search_path='' as $$ begin
 if not private.is_admin() then raise exception 'admin required' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(52005002);
 if p_done is not null then
  if exists(select 1 from public.product_images where storage_path=p_done) then raise exception 'image still linked' using errcode='23514';end if;
  delete from private.product_uploads where path=p_done and exists(select 1 from private.product_media_cleanup where path=p_done);
  delete from private.product_media_cleanup where path=p_done;
 end if;
 insert into private.product_media_cleanup(path,product_id,user_id) select u.path,u.product_id,auth.uid() from private.product_uploads u where u.created_at<now()-interval '24 hours' and not exists(select 1 from public.product_images i where i.id=u.id) on conflict(path) do nothing;
 return query select j.path from private.product_media_cleanup j where not exists(select 1 from public.product_images i where i.storage_path=j.path) order by j.created_at limit 20;
end $$;
revoke all on function public.admin_product_cleanup(text) from public,anon;
grant execute on function public.admin_product_cleanup(text) to authenticated;
create function public.admin_product_search(p_query text default '',p_category uuid default null,p_status text default '',p_sort text default 'newest',p_page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;begin
 if not private.is_admin() then raise exception 'admin required' using errcode='42501';end if;
 if length(coalesce(p_query,''))>120 or p_page is null or p_page<1 or p_page>1000000 or p_status not in ('','draft','published','archived') or p_sort not in ('newest','oldest','price_asc','price_desc','name','stock') then raise exception 'invalid filters' using errcode='23514';end if;
 with recursive tree as (select id from public.categories where id=p_category union select c.id from public.categories c join tree t on c.parent_id=t.id),
 base as (select p.*,(select i.id from public.product_images i where i.product_id=p.id order by i.is_primary desc,i.sort_order,i.id limit 1) cover_id,
  coalesce((select sum(v.stock) from public.product_variants v where v.product_id=p.id and v.is_active),0) stock,
  coalesce((select jsonb_agg(c.name order by c.sort_order,c.id) from public.product_categories pc join public.categories c on c.id=pc.category_id where pc.product_id=p.id),'[]'::jsonb) category_names
  from public.products p where (coalesce(p_query,'')='' or position(lower(p_query) in lower(p.name||' '||p.sku))>0)
  and (p_status='' or p.status=p_status) and (p_category is null or exists(select 1 from public.product_categories pc where pc.product_id=p.id and pc.category_id in(select id from tree)))),
 paged as (select * from base order by case when p_sort='oldest' then created_at end asc,case when p_sort='price_asc' then price_kopecks end asc,case when p_sort='price_desc' then price_kopecks end desc,case when p_sort='name' then name end asc,case when p_sort='stock' then stock end asc,case when p_sort='newest' then created_at end desc,id limit 20 offset (p_page-1)*20)
 select jsonb_build_object('total',(select count(*) from base),'items',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb)) into result;
 return result;end $$;
revoke all on function public.admin_product_search(text,uuid,text,text,integer) from public,anon;
grant execute on function public.admin_product_search(text,uuid,text,text,integer) to authenticated;
commit;
