import {FormError} from "../form-error.ts";
export const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const transliteration:Record<string,string>={'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ye','ж':'zh','з':'z','и':'y','і':'i','ї':'yi','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ь':'','ю':'yu','я':'ya','ы':'y','э':'e','ё':'yo','ъ':''};
export function categorySlug(value:string){return [...value.toLowerCase()].map(c=>transliteration[c]??c).join('').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/['’ʼ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');}
export type TreeCategory={id:string;parent_id:string|null;name:string;sort_order:number;is_visible:boolean;archived_at:string|null};
export function categoryRows<T extends TreeCategory>(categories:T[]){
 const rows:{category:T;depth:number;path:string;effectiveVisible:boolean}[]=[];const seen=new Set<string>();
 const children=(parent:string|null)=>categories.filter(c=>c.parent_id===parent).sort((a,b)=>Number(!!a.archived_at)-Number(!!b.archived_at)||a.sort_order-b.sort_order||a.id.localeCompare(b.id));
 const stack=children(null).reverse().map(category=>({category,depth:0,path:category.name,effectiveVisible:category.is_visible&&!category.archived_at}));
 while(stack.length){const row=stack.pop()!;if(seen.has(row.category.id))continue;seen.add(row.category.id);rows.push(row);for(const category of children(row.category.id).reverse())stack.push({category,depth:row.depth+1,path:row.path+' / '+category.name,effectiveVisible:row.effectiveVisible&&category.is_visible&&!category.archived_at});}
 return rows;
}
export function descendantIds(categories:TreeCategory[],id:string){const result=new Set([id]);let changed=true;while(changed){changed=false;for(const c of categories)if(c.parent_id&&result.has(c.parent_id)&&!result.has(c.id)){result.add(c.id);changed=true;}}return result;}
export function categoryInput(form:FormData){
 const text=(key:string)=>String(form.get(key)??'').trim();const name=text('name'),slug=text('slug'),description=text('description'),parent_id=text('parent_id')||null,order=text('sort_order');
 if(!name||name.length>120)throw new FormError('Назва має містити від 1 до 120 символів.');
 if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)||slug.length>100)throw new FormError('Slug: до 100 символів, латиниця, цифри та дефіси.');
 if(description.length>5000)throw new FormError('Опис має містити не більше 5000 символів.');
 if(parent_id&&!uuidPattern.test(parent_id))throw new FormError('Оберіть коректну батьківську категорію.');
 if(!/^\d+$/.test(order)||!Number.isSafeInteger(Number(order))||Number(order)>2147483647)throw new FormError('Порядок: ціле число від 0 до 2147483647.');
 return {name,slug,description,parent_id,sort_order:Number(order),is_visible:form.get('is_visible')==='on'};
}
export const maxCategoryImage=3*1024*1024;
export function imageExtension(type:string,bytes:Uint8Array){
 if(type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpg';
 if(type==='image/png'&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'png';
 if(type==='image/webp'&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'webp';
 throw new FormError('Оберіть справжнє зображення JPEG, PNG або WebP.');
}
