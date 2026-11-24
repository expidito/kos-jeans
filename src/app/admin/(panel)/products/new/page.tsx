import {getAdminCategories} from '@/lib/categories/admin';import {ProductEditor} from '@/components/admin/products/editor';
export default async function NewProduct(){const categories=await getAdminCategories();return <ProductEditor id={crypto.randomUUID()} categories={categories}/>;}
