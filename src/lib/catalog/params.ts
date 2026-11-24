export type CatalogFilters = { q: string; category: string; sizes: string[]; colors: string[]; min: string; max: string; stock: boolean; sort: string; page: number; new: boolean; sale: boolean };
export type SearchValues = Record<string,string|string[]|undefined>;
export function parseFilters(values: SearchValues): CatalogFilters {
  const one=(k:string)=>(Array.isArray(values[k])?values[k][0]:values[k]||'').slice(0,120);
  const many=(k:string)=>[...new Set((Array.isArray(values[k])?values[k]:values[k]?[values[k]]:[]).filter(v=>v.length<=60))].slice(0,30);
  const price=(k:string)=>/^\d{1,7}(\.\d{1,2})?$/.test(one(k))?one(k):'';
  return {q:one('q').trim(),category:one('category'),sizes:many('size'),colors:many('color'),min:price('min'),max:price('max'),stock:one('stock')==='1',sort:['price-asc','price-desc'].includes(one('sort'))?one('sort'):'newest',page:Math.min(10000,Math.max(1,Number.parseInt(one('page'))||1)),new:one('new')==='1',sale:one('sale')==='1'};
}
export function priceMinor(value:string) { if(!value)return null; const [whole,fraction='']=value.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0')); }
export function filterUrl(base:string,f:CatalogFilters,page:number) {
  const p=new URLSearchParams();for(const [k,v]of Object.entries({q:f.q,category:f.category,min:f.min,max:f.max,sort:f.sort,new:f.new?'1':'',sale:f.sale?'1':'',stock:f.stock?'1':''}))if(v)p.set(k,v);
  for(const s of f.sizes)p.append('size',s);for(const c of f.colors)p.append('color',c);if(page>1)p.set('page',String(page));
  return `${base}?${p}`;
}
