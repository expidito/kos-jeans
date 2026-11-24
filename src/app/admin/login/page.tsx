import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { adminSession } from '@/lib/admin/auth';
import { adminConfigured } from '@/lib/admin/policy';

const messages: Record<string, string> = {
  credentials: 'Не вдалося увійти. Перевірте email та пароль.',
  forbidden: 'Цей обліковий запис не має доступу адміністратора. Зверніться до власника магазину.',
  unavailable: 'Вхід тимчасово недоступний. Перевірте підключення тестового середовища або спробуйте пізніше.',
  session: 'Увійдіть, щоб продовжити. Попередня сесія могла завершитися.',
  rate: 'Забагато спроб входу. Зачекайте та спробуйте ще раз.',
  logout: 'Не вдалося завершити вихід. Спробуйте ще раз.',
};
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await adminSession();
  if (session.status === 'admin') redirect('/admin');
  const params = await searchParams;
  const error = typeof params.error === 'string' ? messages[params.error] : null;
  const enabled = adminConfigured();
  return <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[1fr_1fr]">
    <aside className="relative flex flex-col justify-between bg-ink px-6 py-8 text-paper sm:px-12 lg:min-h-dvh lg:p-16">
      <Link href="/" className="text-2xl font-extrabold tracking-[-0.06em]">KOS JEANS /</Link>
      <div className="mt-12 max-w-lg lg:my-24"><p className="mb-5 text-[10px] tracking-[0.2em] text-white/60">ПРОСТІР КЕРУВАННЯ</p><h1 className="text-4xl leading-[1.08] font-medium tracking-[-0.05em] sm:text-5xl lg:text-7xl">Ваш магазин.<br/><span className="text-white/50">Під контролем.</span></h1><p className="mt-6 max-w-sm text-sm leading-7 text-white/65">Асортимент, колекції та щоденні справи KOS JEANS в одному просторі.</p></div>
      <p className="mt-8 text-[10px] tracking-[0.12em] text-white/45">KOS JEANS · ADMINISTRATION</p>
    </aside>
    <main id="main-content" className="flex items-center justify-center px-5 py-12 sm:px-12 lg:py-20">
      <div className="w-full max-w-sm"><p className="mb-3 text-[10px] tracking-[0.18em] text-denim">ЛИШЕ ДЛЯ АДМІНІСТРАТОРА</p><h2 className="text-3xl font-medium tracking-[-0.04em]">Вхід до магазину</h2><p className="mt-3 mb-8 text-sm leading-6 text-muted">Використовуйте обліковий запис, якому власник надав доступ.</p>
        {!enabled && <p role="status" className="mb-6 border border-line bg-paper p-4 text-sm leading-6">Адміністрування ще не підключене в цьому середовищі. Вхід доступний у тестовому Preview.</p>}
        {error && <p role="alert" className="mb-6 border border-line bg-paper p-4 text-sm leading-6">{error}</p>}
        {params.notice === 'logout' && <p role="status" className="mb-6 border border-line bg-paper p-4 text-sm">Ви вийшли з облікового запису.</p>}
        <form action="/admin/auth/login" method="post" className="space-y-5">
          <div><label htmlFor="email" className="mb-2 block text-xs font-semibold">Email</label><input id="email" name="email" type="email" required maxLength={254} autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={!enabled} className="min-h-12 w-full min-w-0 border border-control bg-paper px-4 text-base"/></div>
          <div><label htmlFor="password" className="mb-2 block text-xs font-semibold">Пароль</label><input id="password" name="password" type="password" required maxLength={1024} autoComplete="current-password" disabled={!enabled} className="min-h-12 w-full min-w-0 border border-control bg-paper px-4 text-base"/></div>
          <Button type="submit" disabled={!enabled} className="w-full">Увійти <span aria-hidden="true">↗</span></Button>
        </form>
        <p className="mt-6 text-xs leading-6 text-muted">Публічної реєстрації немає. Якщо ви втратили доступ, зверніться до власника для відновлення через Supabase.</p>
        <Link href="/" className="mt-8 inline-flex min-h-11 items-center border-b border-control text-xs">← Повернутися до магазину</Link>
      </div>
    </main>
  </div>;
}
