import {publicCatalogClient} from '@/lib/catalog/data';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'};
  const id=(await params).id;if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404,headers});
  const client=publicCatalogClient();if(!client)return new Response(null,{status:404,headers});
  try {const {data:image,error}=await client.from('product_images').select('storage_path').eq('id',id).maybeSingle();
    if(error)return new Response(null,{status:503,headers});if(!image)return new Response(null,{status:404,headers});
    const {data,error:downloadError}=await client.storage.from('store-media').download(image.storage_path);
    if(downloadError||!data)return new Response(null,{status:404,headers});
    return new Response(await data.arrayBuffer(),{headers:{...headers,'Content-Type':data.type||'application/octet-stream'}});
  }catch{return new Response(null,{status:503,headers});}
}
