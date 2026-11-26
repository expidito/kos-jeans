'use server';
import {preparePhoto} from '@/lib/media/transform';
import {FormError, publicFormMessage} from "@/lib/form-error";

import {createHash} from 'node:crypto';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/admin/auth';
import {categoryInput,descendantIds,imageExtension,maxCategoryImage,uuidPattern} from '@/lib/categories/validation';
import type {Json} from '@/lib/supabase/database.types';
export type CategoryState={error?:string;requestId?:string;recovery?:string};
const nextPhase=(id:string)=>{const h=createHash('sha256').update(id+':category-photo').digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
function databaseMessage(code?:string){return code==='23505'?'Цей slug уже використовується або збережений для старого URL. Оберіть інший.':code==='40001'?'Категорію вже змінено або запит повторно використано. Оновіть сторінку перед наступним збереженням.':code==='23514'?'Неможливе вкладення або недійсні дані. Перевірте батьківську категорію та її архівний стан.':'Не вдалося зберегти категорію. Спробуйте ще раз.';}
export async function saveCategory(_state:CategoryState,form:FormData):Promise<CategoryState>{
 const {client}=await requireAdmin();let created=false;let id='';let message='Не вдалося зберегти категорію.';
 try{
  id=String(form.get('id')??'');const requestId=String(form.get('request_id')??'');
  if(!uuidPattern.test(id)||!uuidPattern.test(requestId))throw new FormError('Оновіть форму та спробуйте ще раз.');
  const input=categoryInput(form);const expected=String(form.get('version')??'')||null;
  const {data:categories,error:treeError}=await client.from('categories').select('*');if(treeError)throw new FormError('Категорії тимчасово недоступні.');
  if(input.parent_id&&(descendantIds(categories,id).has(input.parent_id)||!categories.some(c=>c.id===input.parent_id&&!c.archived_at)))throw new FormError('Не можна обрати себе, власного нащадка або архівну категорію батьківською.');
  const existing=categories.find(c=>c.id===id);
  if(expected&&(!existing||existing.archived_at))throw new FormError('Категорія недоступна для редагування.');
  const file=form.get('image');let image:{bytes:Uint8Array;extension:string;type:string;digest:string}|null=null;
  if(file instanceof File&&file.size){
   if(file.size>maxCategoryImage)throw new FormError('Зображення має бути не більше 3 МБ.');
   const original=new Uint8Array(await file.arrayBuffer());imageExtension(file.type,original);const bytes=new Uint8Array(await preparePhoto(original,file.type));image={bytes,extension:'webp',type:'image/webp',digest:createHash('sha256').update(bytes).digest('hex')};
  }
  const removed=form.get('remove_image')==='on';
  if(removed&&image)throw new FormError('Оберіть одну дію: замінити фото або прибрати його.');
  let imagePath=existing?.image_path??null;
  const write=async(request:string,values:Json,version:string|null,command:string)=>{
   const {error}=await client.rpc('admin_category_write',{p_request_id:request,p_category_id:id,p_values:values,p_expected_version:version??undefined,p_command:command});
   if(error)throw new FormError(databaseMessage(error.code));
  };
  // Storage RLS requires the category to exist. A new category with an image is
  // reserved as hidden first; upload failure exposes a recoverable hidden draft.
  let version=expected;
  if(!expected&&image){
   await write(requestId,{...input,is_visible:false,image_path:null,image_digest:image.digest},null,'create');created=true;
   const record=await client.from('categories').select('updated_at').eq('id',id).single();if(record.error)throw new FormError('Не вдалося перевірити чернетку категорії.');version=record.data.updated_at;
  }
  if(image){
   imagePath=`categories/${id}/${requestId}.${image.extension}`;
   const upload=await client.storage.from('store-media').upload(imagePath,image.bytes,{contentType:image.type,upsert:false,cacheControl:'0'});
   if(upload.error&&String(upload.error.statusCode)!=='409')throw new FormError('Фото не завантажено. Спробуйте ще раз.');
  }
  if(removed)imagePath=null;
  await write(created?nextPhase(requestId):requestId,{...input,image_path:imagePath,...(image?{image_digest:image.digest}:{})},version,expected||created?'save':'create');
 }catch(error){
  message=publicFormMessage(error,message);
  return {error:message,requestId:crypto.randomUUID(),...(created?{recovery:`/admin/categories/${id}`}:{})};
 }
 revalidatePath('/admin/categories');
 redirect(`/admin/categories/${id}?notice=saved`);
}
export async function archiveCategory(_state:CategoryState,form:FormData):Promise<CategoryState>{
 const {client}=await requireAdmin();
 try{
  const id=String(form.get('id')??''),requestId=String(form.get('request_id')??''),version=String(form.get('version')??''),command=String(form.get('command')??'');
  if(!uuidPattern.test(id)||!uuidPattern.test(requestId)||!version||!['archive','restore'].includes(command)||form.get('confirmed')!=='on')throw new FormError('Підтвердьте дію перед продовженням.');
  const {error}=await client.rpc('admin_category_write',{p_request_id:requestId,p_category_id:id,p_values:{},p_expected_version:version,p_command:command});
  if(error)throw new FormError(databaseMessage(error.code));
 }catch(error){return {error:publicFormMessage(error,'Не вдалося змінити архівний стан.'),requestId:crypto.randomUUID()};}
 revalidatePath('/admin/categories');redirect('/admin/categories?notice=archived');
}
