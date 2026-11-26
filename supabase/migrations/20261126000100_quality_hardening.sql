begin;
-- Denied session/IP attempts must not exhaust unrelated customers' global allowance.
create or replace function public.checkout_throttle(p_keys text[]) returns boolean language plpgsql security definer set search_path='' as $$
declare k text;n integer;cap integer;begin
 if coalesce(array_length(p_keys,1),0)<>3 or (select count(distinct split_part(x,':',1)) from unnest(p_keys) x)<>3 then return false;end if;
 if exists(select 1 from unnest(p_keys) x where x !~ '^(global|ip|session):[a-f0-9]{64}$' or x is null) then return false;end if;
 for k in select x from unnest(p_keys) x order by case when x like 'ip:%' then 0 when x like 'session:%' then 1 else 2 end,x loop
  cap:=case when k like 'global:%' then 200 when k like 'ip:%' then 40 else 20 end;
  insert into private.checkout_limits values(k,now(),1) on conflict(key) do update set
   requests=case when private.checkout_limits.window_start<now()-interval '10 minutes' then 1 else least(private.checkout_limits.requests+1,cap+1) end,
   window_start=case when private.checkout_limits.window_start<now()-interval '10 minutes' then now() else private.checkout_limits.window_start end returning requests into n;
  if n>cap then return false;end if;
 end loop;
 delete from private.checkout_limits where window_start<now()-interval '1 day';return true;end $$;
-- Keep both orders balanced if trusted maintenance reparents an order line.
create or replace function private.check_order_sum() returns trigger language plpgsql security definer set search_path='' as $$
declare targets uuid[];target uuid;expected bigint;actual bigint;begin
 if tg_table_name='orders' then targets:=array[new.id];
 elsif tg_op='DELETE' then targets:=array[old.order_id];
 elsif tg_op='UPDATE' then targets:=array[old.order_id,new.order_id];
 else targets:=array[new.order_id];end if;
 for target in select distinct x from unnest(targets) x order by x loop
  select total_kopecks into expected from public.orders where id=target;
  if found then select coalesce(sum(line_total_kopecks),0) into actual from public.order_items where order_id=target;
   if actual<>expected then raise exception 'order total mismatch' using errcode='23514';end if;
  end if;
 end loop;return null;end $$;
commit;
