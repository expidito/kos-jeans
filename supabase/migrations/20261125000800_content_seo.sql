begin;
create function private.touch_content_version() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');return new;end$$;
revoke all on function private.touch_content_version() from public,anon,authenticated,service_role;
drop trigger touch_updated_at on public.homepage_banners;
drop trigger touch_updated_at on public.store_settings;
create trigger touch_updated_at before update on public.homepage_banners for each row execute function private.touch_content_version();
create trigger touch_updated_at before update on public.store_settings for each row execute function private.touch_content_version();
alter table public.homepage_banners add column archived_at timestamptz;
alter table public.homepage_banners alter column image_path drop not null;
alter table public.store_settings drop constraint store_settings_key_check;
alter table public.store_settings add constraint store_settings_key_check check(key in ('brand','contacts','social_links','about','delivery_template','payment_template','returns_template','privacy_template','terms_template'));
revoke insert,update,delete on public.homepage_banners,public.store_settings from authenticated,anon;
drop policy public_read on public.homepage_banners;
create policy public_read on public.homepage_banners for select to anon,authenticated using(is_visible and archived_at is null and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
create or replace function private.media_is_public(path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.product_images i where i.storage_path=path and private.product_is_public(i.product_id))
 or exists(select 1 from public.categories c where c.image_path=path and private.category_is_public(c.id))
 or exists(select 1 from public.homepage_banners b where b.image_path=path and b.is_visible and b.archived_at is null and (b.starts_at is null or b.starts_at<=now()) and (b.ends_at is null or b.ends_at>now()));$$;
create table private.content_requests(id uuid primary key,actor uuid not null,fingerprint text not null,result jsonb not null,created_at timestamptz not null default now());
alter table private.content_requests enable row level security;
revoke all on private.content_requests from public,anon,authenticated,service_role;
create function public.admin_content_write(p_request uuid,p_kind text,p_target text,p_version timestamptz default null,p_values jsonb default '{}',p_command text default 'save') returns jsonb
language plpgsql security definer set search_path='' as $$
declare fp text;prev private.content_requests;b public.homepage_banners;s public.store_settings;out jsonb;v jsonb;f text;path text;bid uuid;public_value boolean:=true;begin
 if not private.is_admin() then raise exception 'admin required' using errcode='42501';end if;
 if p_request is null or p_kind is null or p_target is null or p_command is null or p_kind not in ('banner','setting') or p_command not in ('reserve','save','archive') or jsonb_typeof(p_values) is distinct from 'object' then raise exception 'invalid content' using errcode='22023';end if;
 fp:=encode(sha256(convert_to(jsonb_build_array(p_kind,p_target,p_version,p_values,p_command)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,140014));select * into prev from private.content_requests where id=p_request;
 if found then if prev.actor<>auth.uid() or prev.fingerprint<>fp then raise exception 'request conflict' using errcode='P0012';end if;return prev.result;end if;
 perform pg_advisory_xact_lock(52005001);perform pg_advisory_xact_lock(52005002);
 if p_kind='banner' then
 bid:=p_target::uuid;select * into b from public.homepage_banners where homepage_banners.id=bid for update;
 if p_command='reserve' then
  if found then raise exception 'banner exists' using errcode='23505';end if;
  insert into public.homepage_banners(id,title,image_path) values(bid,'Новий банер',null) returning * into b;
 else
  if not found then raise exception 'banner missing' using errcode='P0002';end if;
  if b.updated_at is distinct from p_version then raise exception 'content changed' using errcode='40001';end if;
  if b.archived_at is not null then raise exception 'archived banner' using errcode='23514';end if;
  if p_command='archive' then update public.homepage_banners set archived_at=now(),is_visible=false where homepage_banners.id=bid returning * into b;
  else
   if length(coalesce(p_values->>'title','')) not between 1 and 200 or length(coalesce(p_values->>'subtitle',''))>500 or length(coalesce(p_values->>'alt_text',''))>200 or length(coalesce(p_values->>'button_label',''))>80
    or jsonb_typeof(p_values->'is_visible') is distinct from 'boolean' or coalesce(p_values->>'sort_order','') !~ '^[0-9]{1,7}$' or (p_values->>'sort_order')::integer>1000000 then raise exception 'invalid banner' using errcode='22023';end if;
   path:=p_values->>'link_path';
   if path is null or length(path)>240 or path !~ '^(/|/#about|/catalog|/contacts|/delivery|/returns|/privacy|/terms|/catalog/[a-z0-9]+(-[a-z0-9]+)*|/product/[a-z0-9]+(-[a-z0-9]+)*)$' then raise exception 'unsafe link' using errcode='23514';end if;
   if path like '/catalog/%' and not exists(select 1 from public.categories c where c.slug=substr(path,10) and private.category_is_public(c.id)) then raise exception 'category unavailable' using errcode='23514';end if;
   if path like '/product/%' and not exists(select 1 from public.products p where p.slug=substr(path,10) and private.product_is_public(p.id)) then raise exception 'product unavailable' using errcode='23514';end if;
   if p_values->>'image_path' is not null and (not (p_values->>'image_path' ~ ('^banners/'||bid::text||'/[a-f0-9-]+\.(jpg|jpeg|png|webp)$')) or not exists(select 1 from storage.objects o where o.bucket_id='store-media' and o.name=p_values->>'image_path')) then raise exception 'image unavailable' using errcode='23514';end if;
   if (p_values->>'is_visible')::boolean and (p_values->>'image_path' is null or coalesce(p_values->>'alt_text','')='' or coalesce(p_values->>'button_label','')='') then raise exception 'publication incomplete' using errcode='23514';end if;
   update public.homepage_banners set title=p_values->>'title',subtitle=p_values->>'subtitle',alt_text=p_values->>'alt_text',image_path=p_values->>'image_path',link_path=path,button_label=p_values->>'button_label',sort_order=(p_values->>'sort_order')::integer,is_visible=(p_values->>'is_visible')::boolean,starts_at=nullif(p_values->>'starts_at','')::timestamptz,ends_at=nullif(p_values->>'ends_at','')::timestamptz where homepage_banners.id=bid returning * into b;
  end if;
 end if;out:=jsonb_build_object('version',b.updated_at,'id',b.id);
 else
 if p_command<>'save' or p_target not in ('brand','contacts','social_links','about','delivery_template','payment_template','returns_template','privacy_template','terms_template') then raise exception 'invalid setting' using errcode='22023';end if;
 select * into s from public.store_settings where key=p_target for update;
 if (found and s.updated_at is distinct from p_version) or (not found and p_version is not null) then raise exception 'content changed' using errcode='40001';end if;
 -- Construct an allowlisted public object; unknown keys can never contain secrets.
 if p_target='brand' then
  if jsonb_typeof(p_values->'name') is distinct from 'string' or length(btrim(p_values->>'name')) not between 1 and 100 then raise exception 'invalid brand' using errcode='22023';end if;
  v:=jsonb_build_object('name',btrim(p_values->>'name'));
 elsif p_target='contacts' then
  if jsonb_typeof(p_values->'phone') is distinct from 'string' or jsonb_typeof(p_values->'email') is distinct from 'string' or jsonb_typeof(p_values->'verified') is distinct from 'boolean' or (p_values->>'phone'<>'' and p_values->>'phone' !~ '^\+380[0-9]{9}$') or length(p_values->>'email')>254 or (p_values->>'email'<>'' and p_values->>'email' !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$') then raise exception 'invalid contacts' using errcode='22023';end if;
  v:=jsonb_build_object('phone',p_values->>'phone','email',p_values->>'email','verified',(p_values->>'verified')::boolean);public_value:=(p_values->>'verified')::boolean;
 elsif p_target='social_links' then
  if jsonb_typeof(p_values->'verified') is distinct from 'boolean' then raise exception 'invalid social status' using errcode='22023';end if;
  v:=jsonb_build_object('verified',(p_values->>'verified')::boolean);public_value:=(p_values->>'verified')::boolean;
  foreach f in array array['instagram','facebook','tiktok','other'] loop
   path:=p_values->>f;
   if path is null or length(path)>500 or (path<>'' and (path !~ '^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:443)?(/[^[:space:]\\]*)?$' or path ~ '[[:cntrl:]<>]')) then raise exception 'unsafe social URL' using errcode='22023';end if;
   v:=v||jsonb_build_object(f,path);
  end loop;
 else
  if jsonb_typeof(p_values->'text') is distinct from 'string' or length(p_values->>'text')>12000 or jsonb_typeof(p_values->'draft') is distinct from 'boolean' then raise exception 'invalid template' using errcode='22023';end if;
  v:=jsonb_build_object('text',p_values->>'text','draft',(p_values->>'draft')::boolean);
 end if;
 insert into public.store_settings(key,value,is_public) values(p_target,v,public_value) on conflict(key) do update set value=excluded.value,is_public=excluded.is_public returning * into s;
 out:=jsonb_build_object('version',s.updated_at,'id',s.key);
 end if;
 insert into private.content_requests(id,actor,fingerprint,result) values(p_request,auth.uid(),fp,out);
 delete from private.content_requests where created_at<now()-interval '30 days';return out;
end $$;
revoke all on function public.admin_content_write(uuid,text,text,timestamptz,jsonb,text) from public,anon,service_role;
grant execute on function public.admin_content_write(uuid,text,text,timestamptz,jsonb,text) to authenticated;
commit;
