import {CatalogPage} from '@/components/catalog/catalog-page';
import type {SearchValues} from '@/lib/catalog/params';
import {getCategories} from '@/lib/catalog/data';
import {notFound} from 'next/navigation';
import {Suspense} from 'react';
import Loading from '@/components/catalog/loading';
export const dynamic='force-dynamic';
export const metadata={title:'Категорія',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<SearchValues>}){const slug=(await params).slug;const categories=await getCategories();if(!categories.some(c=>c.slug===slug))notFound();return <Suspense fallback={<Loading/>}><CatalogPage slug={slug} categories={categories} search={await searchParams}/></Suspense>;}
