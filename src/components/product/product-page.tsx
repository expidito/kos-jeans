import Link from 'next/link';
import {notFound} from 'next/navigation';
import {CatalogShell} from '@/components/catalog/catalog-shell';
import {CatalogProductCard} from '@/components/catalog/product-card';
import {Price} from '@/components/ui/price';
import {Badge} from '@/components/ui/badge';
import {Accordion} from '@/components/ui/accordion';
import {ProductGallery} from './gallery';
import {VariantPicker} from './variant-picker';
import {getProduct} from '@/lib/product/data';
import {getCategories,categoryTree} from '@/lib/catalog/data';
import type {Json} from '@/lib/supabase/database.types';

function text(value:Json|undefined):string {if(value==null)return '—';if(typeof value==='boolean')return value?'Так':'Ні';if(Array.isArray(value))return value.map(text).join(' · ');if(typeof value==='object')return Object.entries(value).map(([k,v])=>`${k}: ${text(v)}`).join('; ');return String(value);}
export async function ProductPage({slug}:{slug:string}){
  const data=await getProduct(slug);if(!data)notFound();const categories=await getCategories();const {product:p}=data;
  const category=categories.find(c=>data.categoryIds.includes(c.id));const ancestors=[];let parent=category;while(parent){ancestors.unshift(parent);parent=categories.find(c=>c.id===parent?.parent_id);}
  const policy=(key:string,fallback:string)=>{const v=data.settings.find(s=>s.key===key)?.value;if(v&&typeof v==='object'&&!Array.isArray(v)){const body=v.text??v.body;if(typeof body==='string'&&body.trim())return body;}return fallback;};
  const attributes=p.characteristics&&typeof p.characteristics==='object'&&!Array.isArray(p.characteristics)?Object.entries(p.characteristics):[];
  return <CatalogShell navigation={categoryTree(categories)}><main id="main-content" tabIndex={-1} className="mx-auto max-w-store px-page py-7 sm:py-10"><nav aria-label="Хлібні крихти" className="mb-7 flex flex-wrap gap-x-2 text-xs leading-6 text-muted"><Link prefetch={false} href="/">Головна</Link><span>/</span><Link prefetch={false} href="/catalog">Каталог</Link>{ancestors.map(c=><span key={c.id}> / <Link prefetch={false} href={`/catalog/${c.slug}`}>{c.name}</Link></span>)}<span className="min-w-0 max-w-full break-words">/ {p.name}</span></nav>
    <div className="grid items-start gap-8 md:grid-cols-[1.1fr_1fr] lg:gap-16"><ProductGallery key={p.id} images={data.images} title={p.name}/><div className="min-w-0 md:sticky md:top-28"><div className="mb-4 flex flex-wrap gap-2">{p.is_new&&<Badge tone="denim">Новинка</Badge>}{p.old_price_kopecks&&<Badge tone="sale">−{Math.round((1-p.price_kopecks/p.old_price_kopecks)*100)}%</Badge>}</div><h1 className="break-words text-[clamp(1.75rem,3vw,2.75rem)] leading-tight font-medium tracking-tight">{p.name}</h1><p className="my-5 break-words text-xs text-muted">Артикул: <span data-product-sku>{p.sku}</span></p><div data-product-price><Price amountMinor={p.price_kopecks} previousMinor={p.old_price_kopecks??undefined}/></div><VariantPicker key={p.id} productId={p.id} variants={data.variants}/><div className="mt-8"><Accordion title="Опис товару" open><p className="whitespace-pre-line">{p.description||'Опис товару ще готується.'}</p></Accordion><Accordion title="Матеріал та склад"><p className="whitespace-pre-line">{p.material||'Інформація про матеріал і склад ще не додана.'}</p></Accordion><Accordion title="Характеристики">{attributes.length?<dl className="divide-y divide-line">{attributes.map(([k,v])=><div key={k} className="grid grid-cols-2 gap-4 py-2"><dt className="break-words">{k.replaceAll('_',' ')}</dt><dd className="break-words text-ink">{text(v)}</dd></div>)}</dl>:<p>Характеристики ще не додані.</p>}</Accordion><Accordion title="Доставка та оплата"><p className="whitespace-pre-line">{policy('delivery_template','Умови доставки та оплати ще погоджуються. Магазин поки не приймає замовлень. Перед запуском тут буде опубліковано підтверджену інформацію.')}</p></Accordion><Accordion title="Обмін та повернення"><p className="whitespace-pre-line">{policy('returns_template','Умови обміну та повернення будуть погоджені власником і опубліковані перед запуском магазину.')}</p></Accordion></div></div></div>
    {data.related.length>0&&<section className="mt-section border-t border-line pt-section"><p className="mb-4 text-[10px] tracking-widest text-muted uppercase">KOS JEANS / Добірка</p><h2 className="mb-8 text-heading">Вам також може сподобатися</h2><div className="grid grid-cols-2 gap-5 lg:grid-cols-4">{data.related.map(product=><CatalogProductCard key={product.id} product={product}/>)}</div></section>}
  </main></CatalogShell>;
}
