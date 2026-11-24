import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { adminSections } from '@/lib/admin/policy';
export default async function FutureSection({ params }: { params: Promise<{ section: string[] }> }) {
  await requireAdmin();
  const path = `/admin/${(await params).section.join('/')}`;
  const item = adminSections.find(s => s.href === path);
  if (!item) notFound();
  return <div className="max-w-2xl"><p className="mb-3 text-[10px] tracking-[0.18em] text-denim">КЕРУВАННЯ МАГАЗИНОМ</p><h1 className="text-4xl font-medium tracking-[-0.05em]">{item.label}</h1><section className="mt-8 border border-line bg-paper p-6 sm:p-10"><span className="border border-line px-3 py-2 text-[10px]">БЛОК {item.block.toString().padStart(2, '0')}</span><h2 className="mt-8 text-xl font-medium">Розділ готується</h2><p className="mt-3 text-sm leading-7 text-muted">Інструменти цього розділу будуть реалізовані в окремому блоці. Зараз дані не змінюються; додавання та редагування ще недоступні.</p></section></div>;
}
