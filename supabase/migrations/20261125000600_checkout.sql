begin;
alter table public.orders add column checkout_session_hash text check(checkout_session_hash ~ '^[a-f0-9]{64}$');
create table private.checkout_limits(key text primary key,window_start timestamptz not null,requests integer not null check(requests>0));
alter table private.checkout_limits enable row level security;
revoke all on private.checkout_limits from public,anon,authenticated,service_role;
create function public.checkout_throttle(p_keys text[]) returns boolean language plpgsql security definer set search_path='' as $$
declare k text;n integer;cap integer;begin
 if coalesce(array_length(p_keys,1),0)<>3 then return false;end if;
 foreach k in array p_keys loop
  if k !~ '^(global|ip|session):[a-f0-9]{64}$' then return false;end if;
  cap:=case when k like 'global:%' then 200 when k like 'ip:%' then 40 else 20 end;
  insert into private.checkout_limits values(k,now(),1) on conflict(key) do update set
   requests=case when private.checkout_limits.window_start<now()-interval '10 minutes' then 1 else least(private.checkout_limits.requests+1,cap+1) end,
   window_start=case when private.checkout_limits.window_start<now()-interval '10 minutes' then now() else private.checkout_limits.window_start end returning requests into n;
  if n>cap then return false;end if;
 end loop;
 delete from private.checkout_limits where window_start<now()-interval '1 day';return true;end $$;
revoke all on function public.checkout_throttle(text[]) from public,anon,authenticated;
grant execute on function public.checkout_throttle(text[]) to service_role;

create function private.checkout_result(p_order uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('number',o.order_number::text,'total',o.total_kopecks,'items',
  (select jsonb_agg(jsonb_build_object('variantId',i.variant_id,'quantity',i.quantity) order by i.variant_id) from public.order_items i where i.order_id=o.id)) from public.orders o where o.id=p_order;
$$;
revoke all on function private.checkout_result(uuid) from public,anon,authenticated,service_role;

create function public.checkout_status(p_key uuid,p_session text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;begin
 if p_key is null or p_session is null or p_session !~ '^[a-f0-9]{64}$' then return null;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key::text,120012));
 select id into target from public.orders where idempotency_key=p_key and checkout_session_hash=p_session;
 return private.checkout_result(target);end $$;
revoke all on function public.checkout_status(uuid,text) from public,anon,authenticated;
grant execute on function public.checkout_status(uuid,text) to service_role;

create function public.checkout_submit(p_key uuid,p_session text,p_values jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare customer jsonb;items jsonb;payload jsonb;fingerprint text;existing public.orders;line record;target uuid;total bigint:=0;affected integer;
begin
 if p_key is null or p_session is null or p_session !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_values) is distinct from 'object'
 or jsonb_typeof(p_values->'customer') is distinct from 'object' or jsonb_typeof(p_values->'items') is distinct from 'array'
 then raise exception 'invalid checkout' using errcode='22023';end if;
 customer:=p_values->'customer';items:=p_values->'items';
 if jsonb_array_length(items) not between 1 and 50
 or length(btrim(coalesce(customer->>'name',''))) not between 2 and 100
 or coalesce(customer->>'phone','') !~ '^\+380[0-9]{9}$'
 or length(btrim(coalesce(customer->>'city',''))) not between 2 and 100
 or coalesce(customer->>'method','') not in ('nova_poshta_branch','nova_poshta_address')
 or length(btrim(coalesce(customer->>'address',''))) not between 3 and 300
 or length(coalesce(customer->>'comment',''))>1000 then raise exception 'invalid customer' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(items) x where jsonb_typeof(x) is distinct from 'object'
  or coalesce(x->>'variantId','') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
  or jsonb_typeof(x->'quantity') is distinct from 'number' or coalesce(x->>'quantity','') !~ '^[1-9][0-9]?$'
  or jsonb_typeof(x->'price') is distinct from 'number' or coalesce(x->>'price','') !~ '^[0-9]+$' or (x->>'price')::bigint>2147483647)
  or (select count(*)<>count(distinct x->>'variantId') from jsonb_array_elements(items) x)
 then raise exception 'invalid items' using errcode='22023';end if;
 select jsonb_agg(x order by x->>'variantId') into items from jsonb_array_elements(items) x;
 payload:=jsonb_build_object('customer',customer,'items',items);
 fingerprint:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(payload::text,'UTF8')),'hex');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key::text,120012));
 select * into existing from public.orders where idempotency_key=p_key;
 if found then
  if existing.checkout_session_hash is distinct from p_session or existing.request_fingerprint<>fingerprint then raise exception 'idempotency conflict' using errcode='P0012';end if;
  return private.checkout_result(existing.id);
 end if;
 -- Same catalog guards as admin editing: freeze category visibility and publication
 -- during the transaction. Row locks remain explicit and ordered to avoid overselling.
 perform pg_catalog.pg_advisory_xact_lock(52005001);
 perform pg_catalog.pg_advisory_xact_lock(52005002);
 perform 1 from public.products p where p.id in(select v.product_id from public.product_variants v join jsonb_to_recordset(items) x("variantId" uuid) on v.id=x."variantId") order by p.id for update;
 perform 1 from public.product_variants v join jsonb_to_recordset(items) x("variantId" uuid) on v.id=x."variantId" order by v.id for update of v;
 if (select count(*) from public.product_variants v join jsonb_to_recordset(items) x("variantId" uuid) on v.id=x."variantId")<>jsonb_array_length(items) then raise exception 'unavailable item' using errcode='P0011';end if;
 for line in select v.*,p.price_kopecks,x.quantity,x.price from jsonb_to_recordset(items) x("variantId" uuid,quantity integer,price integer) join public.product_variants v on v.id=x."variantId" join public.products p on p.id=v.product_id order by v.id loop
  if not line.is_active or line.stock<line.quantity or not private.product_is_public(line.product_id) then raise exception 'unavailable item' using errcode='P0011';end if;
  if line.price<>line.price_kopecks then raise exception 'price changed' using errcode='P0010';end if;
  total:=total+line.price_kopecks::bigint*line.quantity;
 end loop;
 insert into public.orders(idempotency_key,checkout_session_hash,request_fingerprint,customer_name,customer_phone,city,delivery_method,delivery_address,comment,total_kopecks)
 values(p_key,p_session,fingerprint,customer->>'name',customer->>'phone',customer->>'city',customer->>'method',customer->>'address',coalesce(customer->>'comment',''),total) returning id into target;
 for line in select v.*,p.name,p.price_kopecks,x.quantity from jsonb_to_recordset(items) x("variantId" uuid,quantity integer) join public.product_variants v on v.id=x."variantId" join public.products p on p.id=v.product_id order by v.id loop
  update public.product_variants set stock=stock-line.quantity where id=line.id and stock>=line.quantity;
  get diagnostics affected=row_count;if affected<>1 then raise exception 'unavailable item' using errcode='P0011';end if;
  insert into public.order_items(order_id,product_id,variant_id,product_name,sku,size,color,unit_price_kopecks,quantity,line_total_kopecks)
   values(target,line.product_id,line.id,line.name,line.sku,line.size,line.color,line.price_kopecks,line.quantity,line.price_kopecks::bigint*line.quantity);
 end loop;
 return private.checkout_result(target);
end $$;
revoke all on function public.checkout_submit(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.checkout_submit(uuid,text,jsonb) to service_role;

create function private.check_order_sum() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;expected bigint;actual bigint;begin
 if tg_table_name='orders' then target:=new.id;elsif tg_op='DELETE' then target:=old.order_id;else target:=new.order_id;end if;
 select total_kopecks into expected from public.orders where id=target;
 if found then select coalesce(sum(line_total_kopecks),0) into actual from public.order_items where order_id=target;
 if actual<>expected then raise exception 'order total mismatch' using errcode='23514';end if;end if;return null;end $$;
revoke all on function private.check_order_sum() from public,anon,authenticated,service_role;
create constraint trigger order_sum_header after insert or update on public.orders deferrable initially deferred for each row execute function private.check_order_sum();
create constraint trigger order_sum_lines after insert or update or delete on public.order_items deferrable initially deferred for each row execute function private.check_order_sum();
commit;
