import 'server-only';
import {requireAdmin} from '@/lib/admin/auth';
export async function getAdminCategories(){
 const {client}=await requireAdmin();
 const {data,error}=await client.from('categories').select('*,product_categories(count)').order('sort_order').order('id');
 if(error)throw Error('Категорії тимчасово недоступні.');return data;
}
