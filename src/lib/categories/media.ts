import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database.types';
export const categoryMediaHeaders={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'};
export async function categoryMedia(client:SupabaseClient<Database>,id:string){
 try{const {data:category,error}=await client.from('categories').select('image_path').eq('id',id).maybeSingle();
  if(error)return new Response(null,{status:503,headers:categoryMediaHeaders});
  if(!category?.image_path)return new Response(null,{status:404,headers:categoryMediaHeaders});
  const {data,error:downloadError}=await client.storage.from('store-media').download(category.image_path);
  if(downloadError||!data)return new Response(null,{status:404,headers:categoryMediaHeaders});
  if(!['image/jpeg','image/png','image/webp'].includes(data.type))return new Response(null,{status:404,headers:categoryMediaHeaders});
  return new Response(await data.arrayBuffer(),{headers:{...categoryMediaHeaders,'Content-Type':data.type}});
 }catch{return new Response(null,{status:503,headers:categoryMediaHeaders});}
}
