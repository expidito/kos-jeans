"use client";
import Link from "next/link";
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main-content" className="mx-auto max-w-store px-page py-16"><p className="text-xs text-muted">KOS JEANS / Каталог</p><h1 className="mt-5 text-heading">Не вдалося завантажити товари.</h1><p className="mt-6 text-sm text-muted">Спробуйте ще раз трохи пізніше.</p><button onClick={reset} className="mt-8 min-h-12 bg-ink px-6 text-paper">Спробувати знову</button><Link prefetch={false} href="/" className="ml-5 underline">На головну</Link></main>;}
