begin;

alter table public.categories add constraint category_image_path check (
  image_path is null or image_path ~ ('^categories/' || id::text || '/[a-f0-9-]+\.(jpg|jpeg|png|webp)$')
);
alter table public.homepage_banners add constraint banner_image_path check (
  image_path ~ ('^banners/' || id::text || '/[a-f0-9-]+\.(jpg|jpeg|png|webp)$')
);

-- Private bucket: raw /object/public URLs cannot reveal draft media.
-- MIME and size are enforced by Storage API; extension/path by RLS as well.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('store-media', 'store-media', false, 5242880, array['image/jpeg','image/png','image/webp']);

create function private.media_path_valid(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when path ~ '^products/[a-f0-9-]{36}/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'
      then exists (select 1 from public.products where id::text = split_part(path, '/', 2))
    when path ~ '^categories/[a-f0-9-]{36}/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'
      then exists (select 1 from public.categories where id::text = split_part(path, '/', 2))
    when path ~ '^banners/[a-f0-9-]{36}/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'
      then exists (select 1 from public.homepage_banners where id::text = split_part(path, '/', 2))
    else false end;
$$;

create function private.media_is_public(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.product_images i where i.storage_path = path and private.product_is_public(i.product_id))
    or exists (select 1 from public.categories c where c.image_path = path and private.category_is_public(c.id))
    or exists (select 1 from public.homepage_banners b where b.image_path = path and b.is_visible
      and (b.starts_at is null or b.starts_at <= now()) and (b.ends_at is null or b.ends_at > now()));
$$;
revoke all on function private.media_path_valid(text), private.media_is_public(text) from public;
grant execute on function private.media_path_valid(text), private.media_is_public(text) to anon, authenticated;

-- Supabase owns storage.objects and already enables RLS. Do not alter that table's ownership/schema.
create policy kos_media_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'store-media' and (private.is_admin() or private.media_is_public(name)));
create policy kos_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'store-media' and private.is_admin() and private.media_path_valid(name));
create policy kos_media_update on storage.objects for update to authenticated
  using (bucket_id = 'store-media' and private.is_admin())
  with check (bucket_id = 'store-media' and private.is_admin() and private.media_path_valid(name));
create policy kos_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'store-media' and private.is_admin());

commit;
