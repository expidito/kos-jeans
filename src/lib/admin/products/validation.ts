const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export type VariantInput={id:string;sku:string;size:string;color:string;stock:number;is_active:boolean};
export type ImageInput={id:string;alt_text:string;is_primary:boolean};
export type ProductInput={name:string;sku:string;slug:string;description:string;material:string;characteristics:Record<string,string>;price_kopecks:number;old_price_kopecks:number|null;status:'draft'|'published'|'archived';is_new:boolean;is_featured:boolean;categories:string[];variants:VariantInput[];images:ImageInput[]};
export function moneyMinor(value:unknown,optional=false):number|null{
 if(optional&&(value===''||value===null||value===undefined))return null;
 if(typeof value!=='string'||!/^\d{1,8}([.,]\d{1,2})?$/.test(value.trim()))throw Error('Ціна: число у гривнях, не більше двох знаків після коми.');
 const [whole,fraction='']=value.trim().replace(',','.').split('.');const minor=BigInt(whole)*BigInt(100)+BigInt(fraction.padEnd(2,'0'));if(minor>BigInt(2147483647))throw Error('Ціна перевищує допустиму суму.');return Number(minor);
}
export function moneyText(value:number|null){return value===null?'':`${Math.floor(value/100)}.${String(value%100).padStart(2,'0')}`;}
export function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Невірний формат даних.');return value as Record<string,unknown>;}
export function text(value:unknown,label:string,max:number,required=false){if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw Error(`${label}: ${required?'заповніть поле, ':''}до ${max} символів.`);return value.trim();}
export function uuid(value:unknown){if(typeof value!=='string'||!uuidPattern.test(value))throw Error('Оновіть сторінку та спробуйте ще раз.');return value;}
export function productInput(raw:unknown):ProductInput{
 const v=object(raw);const name=text(v.name,'Назва',200,true),sku=text(v.sku,'Артикул',80,true),slug=text(v.slug,'Slug',200,true);
 if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))throw Error('Slug має містити лише латиницю, цифри та дефіси.');
 const price=moneyMinor(v.price)!,old=moneyMinor(v.old_price,true);if(old!==null&&old<=price)throw Error('Стара ціна має бути більшою за актуальну.');
 if(!['draft','published','archived'].includes(String(v.status)))throw Error('Оберіть статус публікації.');
 const characteristics:Record<string,string>={};if(!Array.isArray(v.characteristics)||v.characteristics.length>40)throw Error('Дозволено до 40 характеристик.');
 for(const item of v.characteristics){const row=object(item);const key=text(row.name,'Назва характеристики',100),value=text(row.value,'Значення характеристики',500);if(!key&&!value)continue;if(!key||!value||Object.hasOwn(characteristics,key)||['__proto__','constructor','prototype'].includes(key))throw Error('Заповніть унікальні назви й значення характеристик.');characteristics[key]=value;}
 if(!Array.isArray(v.categories)||v.categories.length>20)throw Error('Оберіть не більше 20 категорій.');const categories=v.categories.map(uuid);if(new Set(categories).size!==categories.length)throw Error('Категорії повторюються.');
 if(!Array.isArray(v.variants)||v.variants.length>100)throw Error('Дозволено до 100 варіантів.');const variants=v.variants.map(item=>{const row=object(item),stock=String(row.stock);if(!/^\d+$/.test(stock)||Number(stock)>1000000)throw Error('Залишок: ціле число від 0 до 1000000.');if(typeof row.is_active!=='boolean')throw Error('Перевірте активність варіанта.');return {id:uuid(row.id),sku:text(row.sku,'Артикул варіанта',80,true),size:text(row.size,'Розмір',30,true).toUpperCase(),color:text(row.color,'Колір',60,true),stock:Number(stock),is_active:row.is_active};});
 if(new Set(variants.map(x=>x.id)).size!==variants.length||new Set(variants.map(x=>x.sku)).size!==variants.length||new Set(variants.map(x=>x.size+'\u0000'+x.color.toLowerCase())).size!==variants.length)throw Error('Не повторюйте артикул або поєднання розміру й кольору.');
 if(!Array.isArray(v.images)||v.images.length>10)throw Error('Дозволено до 10 фотографій.');const images=v.images.map(item=>{const row=object(item);if(typeof row.is_primary!=='boolean')throw Error('Оберіть головне фото.');return {id:uuid(row.id),alt_text:text(row.alt_text,'Опис фото',500),is_primary:row.is_primary};});
 if(new Set(images.map(x=>x.id)).size!==images.length||images.filter(x=>x.is_primary).length!==(images.length?1:0))throw Error('Оберіть одне головне фото.');
 if(typeof v.is_new!=='boolean'||typeof v.is_featured!=='boolean')throw Error('Перевірте позначки товару.');
 return {name,sku,slug,description:text(v.description,'Опис',20000),material:text(v.material,'Матеріал',5000),characteristics,price_kopecks:price,old_price_kopecks:old,status:v.status as ProductInput['status'],is_new:v.is_new,is_featured:v.is_featured,categories,variants,images};
}

export function compareVariants(a:{size:string;color:string;id:string},b:{size:string;color:string;id:string}){return a.color.localeCompare(b.color,'uk')||a.size.localeCompare(b.size,'uk',{numeric:true})||a.id.localeCompare(b.id);}
