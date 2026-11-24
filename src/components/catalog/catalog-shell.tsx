"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState,type ReactNode} from 'react';
import {StoreHeader} from '@/components/storefront/store-header';
import {Modal} from '@/components/storefront/modal';
import type {NavigationNode} from '@/lib/storefront';
export function CatalogShell({navigation,children}:{navigation:NavigationNode[];children:ReactNode}){
  const router=useRouter();
  const [dialog,setDialog]=useState<'search'|'basket'|null>(null);
  return <><div className="bg-denim-dark px-4 py-2 text-center text-[11px] text-paper">KOS JEANS / Магазин у розробці · Замовлення ще недоступні</div><StoreHeader catalogMode navigation={navigation} menuImages={{}} onSelect={n=>router.push(n.href)} onSearch={()=>setDialog('search')} onBasket={()=>setDialog('basket')}/>{children}<footer className="mt-16 bg-ink px-page py-12 text-paper"><div className="mx-auto flex max-w-store flex-wrap justify-between gap-6"><Link prefetch={false} href="/" className="text-2xl font-extrabold tracking-tight">KOS JEANS /</Link><Link prefetch={false} href="/catalog" className="inline-flex min-h-11 items-center text-sm underline">Всі товари</Link><p className="text-xs leading-7 text-white/70">Українська / ₴ · Магазин у розробці<br/>Замовлення та оплата ще недоступні.</p></div></footer><Modal open={!!dialog} onClose={()=>setDialog(null)} title={dialog==='search'?'Пошук товарів':'Кошик'}>{dialog==='search'?<form action="/catalog" className="space-y-5"><label className="block text-sm">Назва товару<input name="q" maxLength={120} autoComplete="off" className="mt-3 min-h-12 w-full border border-control px-3"/></label><button className="min-h-12 bg-ink px-6 text-paper">Знайти</button></form>:<p className="text-sm leading-7">Кошик та оформлення замовлення ще не підключені. Зараз можна переглядати каталог.</p>}</Modal></>;
}
