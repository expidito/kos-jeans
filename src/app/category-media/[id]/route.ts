import {publicCatalogClient} from '@/lib/catalog/data';
import {categoryMedia,categoryMediaHeaders} from '@/lib/categories/media';
import {uuidPattern} from '@/lib/categories/validation';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const client=publicCatalogClient();if(!uuidPattern.test(id)||!client)return new Response(null,{status:404,headers:categoryMediaHeaders});return categoryMedia(client,id);}
