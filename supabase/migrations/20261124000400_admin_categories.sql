begin;
create table public.category_slug_history (
 slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 category_id uuid not null references public.categories(id) on delete restrict,
 created_at timestamptz not null default now()
);
alter table public.category_slug_history enable row level security;
revoke all on public.category_slug_history from public,anon,authenticated;
grant select on public.category_slug_history to anon,authenticated;
create policy readable_history on public.category_slug_history for select to anon,authenticated
 using (private.is_admin() or private.category_is_public(category_id));
create index category_history_target on public.category_slug_history(category_id);

create function private.remember_category_slug() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(52005001);
 if exists(select 1 from public.category_slug_history where slug=new.slug and category_id<>new.id)
 then raise exception 'reserved category slug' using errcode='23505'; end if;
 if tg_op='UPDATE' and old.slug<>new.slug then
   insert into public.category_slug_history(slug,category_id) values(old.slug,old.id) on conflict(slug) do nothing;
 end if;
 return new;
end $$;
revoke all on function private.remember_category_slug() from public,anon,authenticated;
create trigger category_slug_history before insert or update of slug on public.categories
 for each row execute function private.remember_category_slug();

create table private.category_mutations (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 category_id uuid not null references public.categories(id) on delete restrict,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table private.category_mutations enable row level security;
revoke all on private.category_mutations from public,anon,authenticated;
grant select,insert on private.category_mutations to authenticated;
create policy own_admin_receipts on private.category_mutations to authenticated
 using (user_id=(select auth.uid()) and (select private.is_admin()))
 with check (user_id=(select auth.uid()) and (select private.is_admin()));

create function public.admin_category_write(p_request_id uuid,p_category_id uuid,p_values jsonb,
 p_expected_version timestamptz default null,p_command text default 'save') returns uuid
language plpgsql security invoker set search_path='' as $$
declare existing public.categories; receipt private.category_mutations; payload jsonb;
 target_parent uuid; target_name text; target_slug text; target_order integer;
begin
 if not private.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
 if p_request_id is null or p_category_id is null or p_command is null or p_command not in ('create','save','archive','restore')
   or jsonb_typeof(p_values) is distinct from 'object' then raise exception 'invalid category input' using errcode='23514'; end if;
 perform pg_catalog.pg_advisory_xact_lock(52005001);
 payload:=jsonb_build_object('id',p_category_id,'command',p_command,'values',p_values);
 select * into receipt from private.category_mutations where user_id=auth.uid() and request_id=p_request_id;
 if found then
   if receipt.payload<>payload then raise exception 'request reused' using errcode='40001'; end if;
   return receipt.category_id;
 end if;
 select * into existing from public.categories where id=p_category_id for update;
 if p_command='create' then
   if found then raise exception 'category exists' using errcode='23505'; end if;
 else
   if not found or p_expected_version is null or existing.updated_at<>p_expected_version
   then raise exception 'category changed' using errcode='40001'; end if;
 end if;
 if p_command in ('create','save') then
   if p_command='save' and existing.archived_at is not null then raise exception 'restore first' using errcode='23514'; end if;
   target_parent:=nullif(p_values->>'parent_id','')::uuid;
   target_name:=btrim(p_values->>'name'); target_slug:=p_values->>'slug'; target_order:=(p_values->>'sort_order')::integer;
   if target_name is null or length(target_name) not between 1 and 120 or target_slug is null
      or length(target_slug)>100 or target_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or target_order is null or target_order<0 or length(coalesce(p_values->>'description',''))>5000
   then raise exception 'invalid category input' using errcode='23514'; end if;
   if target_parent is not null and (target_parent=p_category_id or not exists(select 1 from public.categories where id=target_parent and archived_at is null))
   then raise exception 'invalid parent' using errcode='23514'; end if;
   if p_command='create' then
     insert into public.categories(id,name,slug,parent_id,description,sort_order,is_visible,image_path)
       values(p_category_id,target_name,target_slug,target_parent,coalesce(p_values->>'description',''),target_order,
         coalesce((p_values->>'is_visible')::boolean,false),nullif(p_values->>'image_path',''));
   else
     update public.categories set name=target_name,slug=target_slug,parent_id=target_parent,
       description=coalesce(p_values->>'description',''),sort_order=target_order,
       is_visible=coalesce((p_values->>'is_visible')::boolean,false),image_path=nullif(p_values->>'image_path','') where id=p_category_id;
   end if;
 elsif p_command='archive' then
   update public.categories set is_visible=false,archived_at=coalesce(archived_at,now()) where id=p_category_id;
 elsif p_command='restore' then
   if existing.parent_id is not null and not exists(select 1 from public.categories where id=existing.parent_id and archived_at is null)
   then raise exception 'restore parent first' using errcode='23514'; end if;
   update public.categories set archived_at=null,is_visible=false where id=p_category_id;
 end if;
 insert into private.category_mutations(user_id,request_id,category_id,payload) values(auth.uid(),p_request_id,p_category_id,payload);
 return p_category_id;
end $$;
revoke all on function public.admin_category_write(uuid,uuid,jsonb,timestamptz,text) from public,anon;
grant execute on function public.admin_category_write(uuid,uuid,jsonb,timestamptz,text) to authenticated;
commit;
