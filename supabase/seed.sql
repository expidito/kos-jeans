-- LOCAL / DISPOSABLE DEV ONLY. Not a migration. No admin users, orders or PII.
-- Stable test UUIDs and explicit draft data. Do not seed production.
insert into public.categories(id, slug, name, is_visible, sort_order) values
  ('10000000-0000-4000-8000-000000000001','test-women','ТЕСТ · Жінкам',true,10),
  ('10000000-0000-4000-8000-000000000003','test-hidden','ТЕСТ · Прихована',false,20);
insert into public.categories(id,parent_id,slug,name,is_visible) values
  ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','test-jeans','ТЕСТ · Джинси',true);
insert into public.products(id,slug,sku,name,description,price_kopecks) values
  ('20000000-0000-4000-8000-000000000001','test-denim','TEST-DENIM','ТЕСТ · Джинси','Синтетичний зразок для перевірки БД; не для продажу.',149900),
  ('20000000-0000-4000-8000-000000000002','test-draft','TEST-DRAFT','ТЕСТ · Чернетка','Не для продажу.',99900);
insert into public.product_categories(product_id,category_id) values
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002');
insert into public.product_variants(id,product_id,sku,size,color,stock,is_active) values
  ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','TEST-DENIM-28','28','Синій',3,true),
  ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','TEST-DENIM-30','30','Синій',0,true);
