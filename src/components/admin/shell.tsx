"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminSections } from '@/lib/admin/policy';

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = adminSections.find(s => s.href === pathname);
  const navigation = <nav aria-label="Адміністративні розділи" className="space-y-1">{adminSections.map((s, i) => <Link key={s.href} href={s.href} prefetch={false} aria-current={pathname === s.href ? 'page' : undefined} className={`flex min-h-12 items-center gap-4 px-4 text-sm transition-colors ${pathname === s.href ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}><span className="w-5 text-[10px] tabular-nums opacity-60" aria-hidden="true">0{i + 1}</span>{s.label}</Link>)}</nav>;
  return <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
    <aside className="hidden bg-ink text-paper lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:px-5 lg:py-8"><Link href="/admin" className="mb-12 px-4 text-2xl font-extrabold tracking-[-0.06em]">KOS JEANS /</Link><p className="mb-4 px-4 text-[9px] tracking-[0.2em] text-white/35">КЕРУВАННЯ МАГАЗИНОМ</p>{navigation}<div className="mt-auto px-4 pt-10"><p className="text-[10px] leading-5 text-white/40">ТЕСТОВЕ СЕРЕДОВИЩЕ<br/>kos-jeans-dev</p><Link href="/" className="mt-5 inline-flex min-h-11 items-center text-xs text-white/70">Відкрити магазин ↗</Link></div></aside>
    <div className="min-w-0"><header className="border-b border-line bg-paper px-5 sm:px-8 lg:px-12"><div className="flex min-h-20 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4"><div><p className="text-[10px] tracking-[0.16em] text-muted">KOS JEANS / ADMIN</p><p className="mt-1 text-sm font-medium">{current?.label ?? 'Панель керування'}</p></div><div className="flex min-w-0 max-w-full items-center gap-4"><div className="min-w-0"><p className="max-w-48 truncate text-xs" title={email}>{email}</p><p className="mt-1 text-[10px] text-muted">Адміністратор · Сесію перевірено</p></div><form action="/admin/auth/logout" method="post"><button type="submit" className="min-h-11 shrink-0 border border-control px-3 text-xs hover:border-ink">Вийти</button></form></div></div><details className="border-t border-line py-3 lg:hidden"><summary className="flex min-h-11 items-center justify-between text-xs font-semibold">Розділи керування <span aria-hidden="true">☰</span></summary><div className="mt-3 bg-ink p-2 text-paper">{navigation}<Link href="/" className="flex min-h-12 items-center px-4 text-xs text-white/70">Відкрити магазин ↗</Link></div></details></header>
      <main id="main-content" className="px-5 py-8 sm:px-8 sm:py-12 lg:px-12">{children}</main>
      <footer className="px-5 pb-8 text-[10px] tracking-wide text-muted sm:px-8 lg:px-12">KOS JEANS / Тестове середовище · Операції магазину ще розробляються</footer>
    </div>
  </div>;
}
