import type {Metadata} from 'next';
import {CatalogPage} from '@/components/catalog/catalog-page';
import type {SearchValues} from '@/lib/catalog/params';
import {Suspense} from 'react';
import Loading from '@/components/catalog/loading';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Каталог',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<SearchValues>}){return <Suspense fallback={<Loading/>}><CatalogPage search={await searchParams}/></Suspense>;}
