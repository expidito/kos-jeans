import {notFound} from 'next/navigation';
import {getProduct} from '@/lib/product/data';
import {ProductPage} from '@/components/product/product-page';
export const dynamic='force-dynamic';
const load=getProduct;
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const data=await load((await params).slug);if(!data)notFound();return {title:data.product.name,description:data.product.description.slice(0,160),robots:{index:false,follow:false}};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const slug=(await params).slug;if(!await load(slug))notFound();return <ProductPage slug={slug}/>;}
