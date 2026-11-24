import Link from 'next/link';
import {getAdminCategories} from '@/lib/categories/admin';
import {CategoryForm} from '@/components/admin/categories/category-form';
export default async function NewCategory(){const categories=await getAdminCategories();return <div className="max-w-4xl"><Link href="/admin/categories" className="inline-flex min-h-11 items-center text-xs underline">← Категорії</Link><h1 className="mt-5 mb-8 text-3xl font-medium tracking-tight sm:text-4xl">Нова категорія</h1><CategoryForm categories={categories} id={crypto.randomUUID()} requestId={crypto.randomUUID()}/></div>;}
