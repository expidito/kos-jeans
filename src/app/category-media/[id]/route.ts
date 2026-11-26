import {mediaWidth} from '@/lib/media/transform';
import {publicCatalogClient} from '@/lib/catalog/data';
import {categoryMedia,categoryMediaHeaders} from '@/lib/categories/media';
import {uuidPattern} from '@/lib/categories/validation';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const client=publicCatalogClient();if(!uuidPattern.test(id)||!client)return new Response(null,{status:404,headers:categoryMediaHeaders});try{return categoryMedia(client,id,mediaWidth(_request));}catch{return new Response(null,{status:400});}}
