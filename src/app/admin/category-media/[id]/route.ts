import {adminSession} from '@/lib/admin/auth';
import {categoryMedia,categoryMediaHeaders} from '@/lib/categories/media';
import {uuidPattern} from '@/lib/categories/validation';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const session=await adminSession();const {id}=await params;if(session.status!=='admin'||!uuidPattern.test(id))return new Response(null,{status:404,headers:categoryMediaHeaders});return categoryMedia(session.client,id);}
