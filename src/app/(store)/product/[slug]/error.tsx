"use client";
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main-content" className="mx-auto max-w-store px-page py-16"><h1 className="text-heading">Не вдалося завантажити товар.</h1><p className="mt-5 text-sm text-muted">Спробуйте ще раз трохи пізніше.</p><button onClick={reset} className="mt-7 min-h-12 bg-ink px-6 text-paper">Спробувати знову</button><Link href="/catalog" className="ml-5 underline">До каталогу</Link></main>;}
