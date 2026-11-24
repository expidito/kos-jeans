import {CatalogPage} from '@/components/catalog/catalog-page';
import type {SearchValues} from '@/lib/catalog/params';
import {getCategories,publicCatalogClient} from '@/lib/catalog/data';
import {notFound,permanentRedirect} from 'next/navigation';
import {Suspense} from 'react';
import Loading from '@/components/catalog/loading';
export const dynamic='force-dynamic';
export const metadata={title:'Категорія',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<SearchValues>}){const slug=(await params).slug;const categories=await getCategories();if(!categories.some(c=>c.slug===slug)){const client=publicCatalogClient();if(client&&/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)&&slug.length<=100){const {data,error}=await client.from('category_slug_history').select('category_id').eq('slug',slug).maybeSingle();if(error)throw Error('Catalog unavailable');const target=categories.find(c=>c.id===data?.category_id);if(target){const query=new URLSearchParams();for(const [key,value] of Object.entries(await searchParams)){if(typeof value==='string')query.append(key,value);else if(Array.isArray(value))value.forEach(v=>query.append(key,v));}permanentRedirect(`/catalog/${target.slug}${query.size?'?'+query.toString():''}`);}}notFound();}return <Suspense fallback={<Loading/>}><CatalogPage slug={slug} categories={categories} search={await searchParams}/></Suspense>;}
