import 'server-only';
import {cache} from 'react';
import {publicCatalogClient,getCatalog,type CatalogItem} from '@/lib/catalog/data';
import {parseFilters} from '@/lib/catalog/params';

export const getProduct=cache(async (slug:string) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length>200) return null;
  const client=publicCatalogClient(); if(!client)return null;
  const {data:product,error}=await client.from('products').select('*').eq('slug',slug).maybeSingle();
  if(error)throw new Error('Product unavailable');if(!product)return null;
  const [photos,variants,categories,settings]=await Promise.all([
    client.from('product_images').select('id,alt_text,is_primary,sort_order').eq('product_id',product.id).order('is_primary',{ascending:false}).order('sort_order').order('id'),
    client.from('product_variants').select('*').eq('product_id',product.id).order('color').order('size').order('id'),
    client.from('product_categories').select('category_id').eq('product_id',product.id).order('category_id'),
    client.from('store_settings').select('key,value').in('key',['delivery_template','payment_template','returns_template']),
  ]);
  if([photos,variants,categories,settings].some(r=>r.error))throw new Error('Product unavailable');
  const categoryIds=(categories.data??[]).map(c=>c.category_id);
  const related=new Map<string,CatalogItem>();
  for(const category of categoryIds.slice(0,4)){
    const result=await getCatalog(parseFilters({}),category);
    for(const p of result.items)if(p.id!==product.id)related.set(p.id,p);
    if(related.size>=4)break;
  }
  return {product,images:photos.data??[],variants:variants.data??[],categoryIds,settings:settings.data??[],related:[...related.values()].slice(0,4)};
});
