-- Apply only to a dedicated development Supabase project first.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.admin_users from public, anon, authenticated;
alter table private.admin_users enable row level security;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admin_users where user_id = (select auth.uid()));
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  description text not null default '',
  image_path text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create index categories_parent_sort_idx on public.categories(parent_id, sort_order, id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku text not null unique check (length(btrim(sku)) between 1 and 80),
  name text not null check (length(btrim(name)) between 1 and 200),
  description text not null default '',
  material text not null default '',
  characteristics jsonb not null default '{}' check (jsonb_typeof(characteristics) = 'object'),
  price_kopecks integer not null check (price_kopecks >= 0),
  old_price_kopecks integer check (old_price_kopecks > price_kopecks),
  currency text not null default 'UAH' check (currency = 'UAH'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_new boolean not null default false,
  is_featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);
create index products_publication_idx on public.products(status, published_at desc, id);

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  primary key (product_id, category_id)
);
create index product_categories_category_idx on public.product_categories(category_id, product_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check (storage_path ~ ('^products/' || product_id::text || '/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'))
);
create unique index product_images_one_primary_idx on public.product_images(product_id) where is_primary;
create index product_images_sort_idx on public.product_images(product_id, sort_order, id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique check (length(btrim(sku)) between 1 and 80),
  size text not null check (length(btrim(size)) between 1 and 30),
  color text not null check (length(btrim(color)) between 1 and 60),
  stock integer not null default 0 check (stock between 0 and 1000000),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, product_id),
  unique (product_id, size, color)
);
create index product_variants_product_idx on public.product_variants(product_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  idempotency_key uuid not null unique,
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null default 'new' check (status in ('new','processing','shipped','completed','cancelled')),
  customer_name text not null check (length(btrim(customer_name)) between 1 and 200),
  customer_phone text not null check (length(customer_phone) between 7 and 30),
  city text not null check (length(btrim(city)) between 1 and 200),
  delivery_method text not null check (length(btrim(delivery_method)) between 1 and 80),
  delivery_address text not null check (length(btrim(delivery_address)) between 1 and 500),
  comment text not null default '' check (length(comment) <= 2000),
  total_kopecks bigint not null check (total_kopecks between 0 and 9007199254740991),
  currency text not null default 'UAH' check (currency = 'UAH'),
  inventory_released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (inventory_released_at is null or status = 'cancelled')
);
create index orders_status_date_idx on public.orders(status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid,
  product_name text not null check (length(btrim(product_name)) > 0),
  sku text not null check (length(btrim(sku)) > 0),
  size text not null check (length(btrim(size)) > 0),
  color text not null check (length(btrim(color)) > 0),
  unit_price_kopecks integer not null check (unit_price_kopecks >= 0),
  quantity integer not null check (quantity between 1 and 1000),
  line_total_kopecks bigint not null,
  check (line_total_kopecks = unit_price_kopecks::bigint * quantity),
  foreign key (variant_id, product_id) references public.product_variants(id, product_id) on delete set null
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_product_idx on public.order_items(product_id);
create index order_items_variant_idx on public.order_items(variant_id);

-- Public content only. No tokens, passwords, payment credentials or private settings.
create table public.store_settings (
  key text primary key check (key in ('brand','contacts','social_links','delivery_template','returns_template')),
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  subtitle text not null default '',
  image_path text not null,
  alt_text text not null default '',
  link_path text check (link_path ~ '^/([^/]|$)' and link_path !~ '[\\[:cntrl:]]'),
  button_label text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index homepage_banners_sort_idx on public.homepage_banners(sort_order, id);

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
do $$ declare t text; begin
  foreach t in array array['categories','products','product_variants','orders','store_settings','homepage_banners'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()', t);
  end loop;
end $$;

create function private.prevent_category_cycle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Serialise tree changes, including concurrent parent swaps.
  perform pg_catalog.pg_advisory_xact_lock(52005001);
  if exists (
    with recursive parents as (
      select id, parent_id from public.categories where id = new.parent_id
      union select c.id, c.parent_id from public.categories c join parents p on c.id = p.parent_id
    ) select 1 from parents where id = new.id
  ) then raise exception 'category cycle' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger category_cycle before insert or update of parent_id on public.categories
for each row execute function private.prevent_category_cycle();

create function private.category_is_public(category uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  with recursive ancestors as (
    select id, parent_id, is_visible, archived_at from public.categories where id = category
    union select c.id, c.parent_id, c.is_visible, c.archived_at from public.categories c join ancestors a on c.id = a.parent_id
  ) select coalesce(bool_and(is_visible and archived_at is null), false) from ancestors;
$$;

create function private.product_is_public(product uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.products p where p.id = product and p.status = 'published'
      and p.published_at <= now() and exists (
        select 1 from public.product_categories pc where pc.product_id = p.id
          and private.category_is_public(pc.category_id)
      )
  );
$$;

do $$ declare t text; begin
  foreach t in array array['categories','products','product_categories','product_images','product_variants','orders','order_items','store_settings','homepage_banners'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy admin_read on public.%I for select to authenticated using ((select private.is_admin()))', t);
  end loop;
  foreach t in array array['categories','products','product_categories','product_images','product_variants','store_settings','homepage_banners'] loop
    execute format('grant select on public.%I to anon', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select private.is_admin()))', t);
    execute format('create policy admin_update on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    execute format('create policy admin_delete on public.%I for delete to authenticated using ((select private.is_admin()))', t);
  end loop;
end $$;

create policy public_read on public.categories for select to anon, authenticated using (private.category_is_public(id));
create policy public_read on public.products for select to anon, authenticated using (private.product_is_public(id));
create policy public_read on public.product_categories for select to anon, authenticated
  using (private.product_is_public(product_id) and private.category_is_public(category_id));
create policy public_read on public.product_images for select to anon, authenticated using (private.product_is_public(product_id));
create policy public_read on public.product_variants for select to anon, authenticated using (is_active and private.product_is_public(product_id));
create policy public_read on public.store_settings for select to anon, authenticated using (is_public);
create policy public_read on public.homepage_banners for select to anon, authenticated
  using (is_visible and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));

-- No guest order RPC or stock write endpoint in block 05.
-- Owner-only primitive for a future single checkout transaction (block 12).
create function private.reserve_inventory(items jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare item record; affected integer;
begin
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 100 then
    raise exception 'invalid inventory request' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(items) e where jsonb_typeof(e) <> 'object'
    or not (e ? 'variant_id' and e ? 'quantity') or e->>'variant_id' is null
    or jsonb_typeof(e->'quantity') is distinct from 'number'
    or e->>'quantity' !~ '^[1-9][0-9]{0,3}$') then
    raise exception 'invalid inventory item' using errcode = '22023';
  end if;
  -- Aggregate duplicate variants, lock in stable order, and recheck stock under lock.
  for item in select (e->>'variant_id')::uuid as variant_id, sum((e->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(items) e group by 1 order by 1
  loop
    if item.quantity > 1000 then raise exception 'quantity limit' using errcode = '22023'; end if;
    -- FOR SHARE serialises publication/price changes against the future checkout transaction.
    perform 1 from public.products p join public.product_variants v on v.product_id = p.id
      where v.id = item.variant_id and private.product_is_public(p.id) for share of p;
    if not found then raise exception 'unavailable product' using errcode = '23514'; end if;
    update public.product_variants set stock = stock - item.quantity
      where id = item.variant_id and is_active and stock >= item.quantity;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'insufficient stock' using errcode = '23514'; end if;
  end loop;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin(), private.category_is_public(uuid), private.product_is_public(uuid) to anon, authenticated;
revoke all on sequence public.orders_order_number_seq from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;

-- Safe self-only check for future server-side admin authorization; not a role editor.
create function public.is_store_admin() returns boolean
language sql stable set search_path = '' as $$ select private.is_admin(); $$;
revoke all on function public.is_store_admin() from public, anon;
grant execute on function public.is_store_admin() to authenticated;

commit;
