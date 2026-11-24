begin;
-- Caller privileges and RLS apply to every table, including facets and totals.
create function public.catalog_search(
  query_text text default '', category_id uuid default null,
  sizes text[] default '{}', colors text[] default '{}',
  min_price integer default null, max_price integer default null,
  in_stock boolean default false, sort_order text default 'newest',
  page_number integer default 1, page_size integer default 12,
  only_new boolean default false, only_sale boolean default false
) returns jsonb language sql stable security invoker set search_path = '' as $$
with recursive category_tree as (
  select id from public.categories where id=category_id
  union select c.id from public.categories c join category_tree t on c.parent_id=t.id
), visible as materialized (
  select p.* from public.products p
  where private.product_is_public(p.id)
), matching as materialized (
  select p.* from visible p where
    (coalesce(query_text,'')='' or strpos(lower(p.name),lower(left(query_text,120)))>0)
    and (category_id is null or exists(select 1 from public.product_categories pc where pc.product_id=p.id and pc.category_id in(select id from category_tree)))
    and (min_price is null or p.price_kopecks>=min_price)
    and (max_price is null or p.price_kopecks<=max_price)
    and (not only_new or p.is_new)
    and (not only_sale or p.old_price_kopecks>p.price_kopecks)
    and ((cardinality(sizes)=0 and cardinality(colors)=0 and not in_stock) or exists(
      select 1 from public.product_variants v where v.product_id=p.id and v.is_active
        and (cardinality(sizes)=0 or v.size=any(sizes))
        and (cardinality(colors)=0 or v.color=any(colors))
        and (not in_stock or v.stock>0)
    ))
), paged as (
  select p.*, (select i.id from public.product_images i where i.product_id=p.id order by i.is_primary desc,i.sort_order,i.id limit 1) as image_id
  from matching p order by
    case when sort_order='price-asc' then p.price_kopecks end asc,
    case when sort_order='price-desc' then p.price_kopecks end desc,
    p.published_at desc,p.id
  limit least(greatest(page_size,1),48) offset ((least(greatest(page_number,1),10000)-1)::bigint * least(greatest(page_size,1),48))
)
select jsonb_build_object(
  'total',(select count(*) from matching),
  'items',coalesce((select jsonb_agg(to_jsonb(p)) from paged p),'[]'::jsonb),
  'sizes',coalesce((select jsonb_agg(s order by s) from(select distinct v.size s from public.product_variants v join visible p on p.id=v.product_id where v.is_active) a),'[]'::jsonb),
  'colors',coalesce((select jsonb_agg(s order by s) from(select distinct v.color s from public.product_variants v join visible p on p.id=v.product_id where v.is_active) a),'[]'::jsonb)
);
$$;
revoke all on function public.catalog_search(text,uuid,text[],text[],integer,integer,boolean,text,integer,integer,boolean,boolean) from public;
grant execute on function public.catalog_search(text,uuid,text[],text[],integer,integer,boolean,text,integer,integer,boolean,boolean) to anon,authenticated;
create index product_variants_filters_idx on public.product_variants(product_id,size,color) where is_active;
commit;
