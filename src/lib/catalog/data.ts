import 'server-only';
import {cache} from 'react';
import {supabaseFetch} from '@/lib/supabase/fetch';
import {createClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database.types';
import {getSupabaseConfig} from '@/lib/supabase/config';
import type {NavigationNode} from '@/lib/storefront';
import {priceMinor,type CatalogFilters} from './params';
export type Category=Database['public']['Tables']['categories']['Row'];
export type CatalogItem=Database['public']['Tables']['products']['Row']&{image_id:string|null};
export type CatalogResult={items:CatalogItem[];total:number;sizes:string[];colors:string[]};
export function publicCatalogClient(){
  // Explicit production isolation until the owner approves a separate production database.
  if(process.env.VERCEL_ENV==='production'||!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return null;
  const {url,key}=getSupabaseConfig();
  return createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:supabaseFetch}});
}
export const getCategories=cache(async()=>{const client=publicCatalogClient();if(!client)return [];
  const {data,error}=await client.from('categories').select('*').order('sort_order').order('id');if(error)throw new Error('Catalog unavailable');return data;
});
export function categoryTree(categories:Category[],parent:string|null=null):NavigationNode[]{return categories.filter(c=>c.parent_id===parent).map(c=>({id:c.id,label:c.name,href:`/catalog/${c.slug}`,children:categoryTree(categories,c.id)}));}
export async function getCatalog(f:CatalogFilters,categoryId:string|null=null):Promise<CatalogResult>{
  const client=publicCatalogClient();if(!client)return {items:[],total:0,sizes:[],colors:[]};
  // RPC types are regenerated after applying the migration; parameters remain typed there.
  const {data,error}=await client.rpc('catalog_search',{query_text:f.q,category_id:categoryId??undefined,sizes:f.sizes,colors:f.colors,min_price:priceMinor(f.min)??undefined,max_price:priceMinor(f.max)??undefined,in_stock:f.stock,sort_order:f.sort,page_number:f.page,page_size:12,only_new:f.new,only_sale:f.sale});
  if(error)throw new Error('Catalog unavailable');return data as unknown as CatalogResult;
}
