import {CatalogPhoto} from './photo';
import {Price} from '@/components/ui/price';
import {Badge} from '@/components/ui/badge';
import type {CatalogItem} from '@/lib/catalog/data';
export function CatalogProductCard({product}:{product:CatalogItem}){
  const discount=product.old_price_kopecks?Math.round((1-product.price_kopecks/product.old_price_kopecks)*100):0;
  return <article className="min-w-0" data-product={product.id}><div className="relative aspect-[3/4] overflow-hidden bg-canvas"><CatalogPhoto id={product.image_id} alt={product.name}/><div className="absolute inset-x-3 top-3 flex flex-wrap justify-between gap-2">{product.is_new&&<Badge tone="denim">Новинка</Badge>}{discount>0&&<Badge tone="sale">−{discount}%</Badge>}</div></div><h2 className="mt-4 break-words text-sm leading-6 font-medium">{product.name}</h2><div className="mt-2"><Price amountMinor={product.price_kopecks} previousMinor={product.old_price_kopecks??undefined}/></div><p className="mt-3 text-[10px] leading-5 text-muted">Детальна сторінка готується · Купівля недоступна</p></article>;
}
