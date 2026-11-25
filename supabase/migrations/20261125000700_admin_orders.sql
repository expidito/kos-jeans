begin;
create function private.touch_order_version() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');return new;end $$;
revoke all on function private.touch_order_version() from public,anon,authenticated,service_role;
drop trigger touch_updated_at on public.orders;
create trigger touch_updated_at before update on public.orders for each row execute function private.touch_order_version();
-- Orders remain read-only through tables. Mutations require a verified Auth role
-- inside this narrow transaction, independently of Next.js and user metadata.
revoke insert, update, delete on public.orders, public.order_items from anon, authenticated;
create function public.admin_order_status(p_order uuid, p_expected_version timestamptz, p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; i record; restored integer:=0; missing integer:=0;
begin
 if not private.is_admin() then raise exception 'admin required' using errcode='42501';end if;
 if p_order is null or p_expected_version is null or p_status is null or p_status not in ('new','processing','shipped','completed','cancelled') then
  raise exception 'invalid status request' using errcode='22023';end if;
 -- Match checkout/editor guard order. No stock can be removed or reassigned
 -- while cancellation maps immutable order lines to their original variant IDs.
 perform pg_catalog.pg_advisory_xact_lock(52005001);
 perform pg_catalog.pg_advisory_xact_lock(52005002);
 select * into o from public.orders where id=p_order for update;
 if not found then raise exception 'order missing' using errcode='P0002';end if;
 -- An identical retry is a no-op even with an old version, including cancellation.
 if o.status=p_status then
  return jsonb_build_object('status',o.status,'version',o.updated_at,'repeated',true,'missingVariants',
   case when o.status='cancelled' then (select count(*) from public.order_items x where x.order_id=o.id and not exists(select 1 from public.product_variants v where v.id=x.variant_id and v.product_id=x.product_id)) else 0 end);
 end if;
 if o.updated_at<>p_expected_version then raise exception 'order changed' using errcode='40001';end if;
 if not ((o.status='new' and p_status in ('processing','cancelled'))
  or (o.status='processing' and p_status in ('shipped','cancelled'))
  or (o.status='shipped' and p_status='completed')) then
  raise exception 'transition not allowed' using errcode='23514';end if;
 if p_status='cancelled' then
  if o.inventory_released_at is not null then raise exception 'inventory already released' using errcode='23514';end if;
  for i in select variant_id,product_id,sum(quantity)::integer quantity from public.order_items where order_id=o.id group by variant_id,product_id order by variant_id loop
   -- Archived/renamed variants keep the same ID and can receive stock. Deleted
   -- variants are never recreated or guessed by mutable SKU/size/color.
   update public.product_variants set stock=stock+i.quantity where id=i.variant_id and product_id=i.product_id;
   if found then restored:=restored+1;else missing:=missing+1;end if;
  end loop;
 end if;
 update public.orders set status=p_status,inventory_released_at=case when p_status='cancelled' then clock_timestamp() else inventory_released_at end,
 updated_at=clock_timestamp() where id=o.id returning * into o;
 return jsonb_build_object('status',o.status,'version',o.updated_at,'repeated',false,'restoredVariants',restored,'missingVariants',missing);
end $$;
revoke all on function public.admin_order_status(uuid,timestamptz,text) from public,anon,service_role;
grant execute on function public.admin_order_status(uuid,timestamptz,text) to authenticated;

create function public.admin_order_search(p_number text default '',p_status text default '',p_from date default null,p_to date default null,p_sort text default 'newest',p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not private.is_admin() then raise exception 'admin required' using errcode='42501';end if;
 if length(p_number)>18 or (p_number<>'' and p_number !~ '^[0-9]+$') or p_page not between 1 and 100000
 or p_status not in ('','new','processing','shipped','completed','cancelled')
 or p_sort not in ('newest','oldest','total_asc','total_desc')
 or (p_from is not null and p_to is not null and p_from>p_to) then raise exception 'invalid filters' using errcode='22023';end if;
 with filtered as (
  select o.id,o.order_number::text order_number,o.customer_name,o.total_kopecks,o.delivery_method,o.status,o.created_at,
   (select coalesce(sum(i.quantity),0) from public.order_items i where i.order_id=o.id) quantity
  from public.orders o where (p_number='' or o.order_number::text=p_number) and (p_status='' or o.status=p_status)
   and (p_from is null or o.created_at>=p_from::timestamp at time zone 'Europe/Kyiv')
   and (p_to is null or o.created_at<(p_to+1)::timestamp at time zone 'Europe/Kyiv')
 ), page as (
  select * from filtered order by
   case when p_sort='oldest' then created_at end asc,
   case when p_sort='total_asc' then total_kopecks end asc,
   case when p_sort='total_desc' then total_kopecks end desc,
   case when p_sort<>'oldest' then created_at end desc,id
   limit 20 offset (p_page-1)*20
 ) select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)) into result;
 return result;end $$;
revoke all on function public.admin_order_search(text,text,date,date,text,integer) from public,anon,service_role;
grant execute on function public.admin_order_search(text,text,date,date,text,integer) to authenticated;
commit;
