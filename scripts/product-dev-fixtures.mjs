import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {devContext,fixtureId} from './catalog-dev-fixtures.mjs';

export async function seedProductDetail(ctx){
  const product=fixtureId('8',1);
  await ctx.sql(`begin;
    insert into public.product_variants(id,product_id,sku,size,color,stock,is_active) values
      ('${fixtureId('9',101)}','${product}','TEST-DETAIL-26','26','Синій',2,true),
      ('${fixtureId('9',102)}','${product}','TEST-DETAIL-29','29','Синій',4,true),
      ('${fixtureId('9',103)}','${product}','TEST-DETAIL-32','32','Білий',0,true)
      on conflict(id) do nothing;
    insert into public.product_images(id,product_id,storage_path,alt_text,sort_order) values
      ('${fixtureId('a',101)}','${product}','products/${product}/${fixtureId('a',101)}.jpg','ТЕСТ · Додаткова фотоілюстрація деніму',1),
      ('${fixtureId('a',102)}','${product}','products/${product}/${fixtureId('a',102)}.jpg','ТЕСТ · Деталь джинсової тканини',2)
      on conflict(id) do nothing;
    update public.products set material=case when material='' then 'ТЕСТ · Інформація про склад не є пропозицією реального товару.' else material end,
      characteristics=case when characteristics='{}'::jsonb then '{"Призначення":"Перевірка сторінки товару","Дані":"Тестовий dev-зразок"}'::jsonb else characteristics end
      where id='${product}' and sku='TEST-CATALOG-1';
    commit;select true as ready;`);
  for(const [n,file]of [[101,'women'],[102,'detail']]){
    const data=await readFile(`public/images/storefront/${file}.jpg`);
    if((await ctx.admin.storage.from('store-media').upload(`products/${product}/${fixtureId('a',n)}.jpg`,data,{contentType:'image/jpeg',upsert:true,cacheControl:'0'})).error)throw Error('Dev gallery upload failed');
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{if(!process.argv.includes('--dev-only'))throw Error('Dev flag required');await seedProductDetail(await devContext());console.log('Dev-only detail fixtures ready: TEST product, three photos and color/size stock cases');}catch{console.error('Detail fixture setup failed; credential-bearing details withheld');process.exitCode=1;}}
