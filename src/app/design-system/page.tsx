import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Price } from "@/components/ui/price";
import { Accordion } from "@/components/ui/accordion";
import { ControlSpecimens } from "@/components/design-system/control-specimens";
import { DenimStudy } from "@/components/design-system/denim-study";

export const metadata: Metadata = {
  title: "Дизайн-система",
  description: "Візуальна мова та інтерактивні зразки компонентів KOS JEANS.",
  robots: { index: false, follow: false },
};

const palette = [
  { name: "Чорний", hex: "#18191B", color: "bg-ink", light: true },
  { name: "Графіт", hex: "#45484C", color: "bg-graphite", light: true },
  { name: "Денім", hex: "#38566F", color: "bg-denim", light: true },
  { name: "Світлий денім", hex: "#EDF2F6", color: "bg-denim-wash", light: false },
  { name: "Світло-сірий", hex: "#F4F4F1", color: "bg-canvas", light: false },
  { name: "Білий", hex: "#FFFFFF", color: "bg-paper", light: false },
];

function SectionTitle({ number, title, note }: { number: string; title: string; note: string }) {
  return <div className="mb-10 grid gap-4 border-t border-ink pt-6 md:grid-cols-[1fr_2fr]">
    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted">{number} / {note}</p>
    <h2 className="text-title font-medium">{title}</h2>
  </div>;
}

export default function DesignSystemPage() {
  return (
    <>
      <header className="mx-auto flex max-w-store flex-wrap items-center justify-between gap-x-10 gap-y-5 px-page py-7">
        <Link href="/" className="text-2xl font-extrabold tracking-[-0.07em]" aria-label="KOS JEANS — головна">KOS JEANS<span className="ml-1 text-denim">/</span></Link>
        <p className="text-[10px] font-semibold tracking-[0.15em] text-muted uppercase">Візуальна система · 01.0</p>
      </header>
      <main id="main-content">
        <div className="border-y border-line">
          <nav aria-label="Розділи дизайн-системи" className="mx-auto flex max-w-store flex-wrap gap-x-7 gap-y-3 px-page py-4 text-xs text-muted">
            <a href="#palette" className="hover:text-ink">01. Колір</a>
            <a href="#type" className="hover:text-ink">02. Типографіка</a>
            <a href="#controls" className="hover:text-ink">03. Взаємодія</a>
            <a href="#patterns" className="hover:text-ink">04. Композиція</a>
          </nav>
        </div>

        <div className="mx-auto max-w-store px-page">
          <section aria-labelledby="design-title" className="grid gap-10 py-12 md:grid-cols-12 md:gap-8 md:py-16">
            <div className="flex flex-col justify-between md:col-span-7">
              <div>
                <div className="mb-9 flex items-center gap-3 text-[10px] font-semibold tracking-[0.12em] uppercase"><span className="h-2 w-2 bg-denim" aria-hidden="true" />KOS JEANS / Основа бренду</div>
                <h1 id="design-title" className="text-display font-medium">Характер<br />у деталях.</h1>
                <p className="mt-7 max-w-sm text-base leading-7 text-muted">Чиста форма. Впевнена типографіка.<br />Денім, який об’єднує все.</p>
              </div>
              <p className="mt-10 max-w-md text-xs leading-6 text-muted">Дизайн-система майбутнього магазину. Тут зібрані кольори, пропорції та зразки взаємодії. Це не каталог товарів.</p>
            </div>
            <div className="relative isolate min-h-96 overflow-hidden bg-denim-dark text-paper md:col-span-5">
              <div className="absolute inset-5 border border-white/20" aria-hidden="true" />
              <div className="absolute inset-y-8 right-0 w-3/4 opacity-40"><DenimStudy light /></div>
              <div className="relative flex min-h-96 flex-col justify-between p-9 lg:min-h-[470px]">
                <p className="font-mono text-[10px] tracking-wider text-white/80">KJ — 001 / ДОСЛІДЖЕННЯ ФОРМИ</p>
                <p className="py-16 text-5xl leading-[0.98] font-medium tracking-[-0.06em] lg:text-6xl">Свій<br />силует.</p>
                <div className="flex justify-between border-t border-white/30 pt-4 text-[10px] tracking-widest uppercase"><span>Денім як акцент</span><span aria-hidden="true">↗</span></div>
              </div>
            </div>
          </section>

          <section id="palette" className="scroll-mt-6 py-section" aria-labelledby="palette-title">
            <SectionTitle number="01" title="Спокійна палітра. Сильний акцент." note="Колір" />
            <h3 id="palette-title" className="sr-only">Палітра KOS JEANS</h3>
            <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-6">
              {palette.map((item) => <div key={item.hex} className={`flex min-h-44 flex-col justify-between p-5 ${item.color} ${item.light ? "text-paper" : "text-ink"}`}><span className="text-xs font-medium">{item.name}</span><span className="font-mono text-[10px]">{item.hex}</span></div>)}
            </div>
            <div className="mt-5 grid gap-3 text-xs leading-6 text-muted md:grid-cols-2"><p>Білий простір і графіт тримають фокус на одязі.</p><p>Денім — для акцентів і вибраних станів. Без декоративного перевантаження.</p></div>
          </section>

          <section id="type" className="scroll-mt-6 pb-section" aria-label="Типографіка та ритм">
            <SectionTitle number="02" title="Виразність без зайвих слів." note="Типографіка" />
            <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
              <div className="border-b border-line pb-7">
                <p className="mb-4 text-xs text-muted">Manrope / 400–800 / українська кирилиця</p>
                <p className="text-[clamp(4rem,10vw,8rem)] leading-none font-medium tracking-[-0.07em]">Аа Бб</p>
                <p className="mt-6 break-words text-lg leading-8 tracking-wide">Ґґ Єє Іі Її · 0123456789 · ₴</p>
                <p className="mt-5 max-w-md text-sm leading-7 text-muted">Чіткий силует літер у заголовках. Легке читання описів. Табличні цифри для цін.</p>
              </div>
              <div className="grid content-start divide-y divide-line">
                <div className="py-4"><p className="mb-3 font-mono text-[10px] text-muted">ЗАГОЛОВОК / 32–56 / 500</p><p className="text-heading font-medium">Форма має значення.</p></div>
                <div className="py-5"><p className="mb-3 font-mono text-[10px] text-muted">ОСНОВНИЙ ТЕКСТ / 16 / 400</p><p className="text-base leading-7">Знайди посадку, у якій почуваєшся собою.</p></div>
                <div className="py-5"><p className="mb-3 font-mono text-[10px] text-muted">ДЕТАЛІ / 12 / 500</p><p className="text-xs leading-6">Синій денім · Прямий силует · 100% бавовна — зразок тексту</p></div>
              </div>
            </div>
            <div className="mt-12 grid gap-8 bg-canvas p-6 sm:p-8 md:grid-cols-[1fr_2fr]">
              <div><h3 className="text-sm font-semibold">Ритм простору</h3><p className="mt-2 text-xs leading-6 text-muted">Базовий крок — 4 px.<br />Між секціями — 56–112 px.</p></div>
              <div className="flex items-end justify-between gap-2">{[4, 8, 16, 24, 32, 48, 64].map((size) => <div key={size} className="flex flex-col items-center gap-3"><div className="w-4 bg-denim sm:w-6" style={{ height: size }} /><span className="font-mono text-[10px] text-muted">{size}</span></div>)}</div>
            </div>
          </section>

          <section id="controls" className="scroll-mt-6 pb-section" aria-label="Компоненти інтерфейсу">
            <SectionTitle number="03" title="Просто обирати. Зручно діяти." note="Взаємодія" />
            <ControlSpecimens />
            <div className="mt-12 grid gap-10 border-t border-line pt-8 lg:grid-cols-2 lg:gap-20">
              <div><p className="mb-5 text-xs text-muted">Мітки та ціна / демонстраційні значення</p><div className="flex flex-wrap gap-2"><Badge tone="denim">Новинка</Badge><Badge tone="sale">−21%</Badge><Badge>Немає в наявності</Badge></div><div className="mt-6"><Price amountMinor={149900} previousMinor={189900} /></div></div>
              <div><p className="mb-3 text-xs text-muted">Розкривний блок</p><Accordion title="Як читати цей зразок?">Це інтерактивна бібліотека компонентів. Натискання кнопок і вибір розміру змінюють лише демонстраційний стан.</Accordion><Accordion title="Доставка та повернення">Тут буде погоджена власником інформація. Умови й строки ще не визначені.</Accordion></div>
            </div>
          </section>

          <section id="patterns" className="scroll-mt-6 pb-section" aria-label="Пропорції карток і навігація">
            <SectionTitle number="04" title="Товар — у центрі уваги." note="Композиція" />
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
              <div className="flex flex-col items-start">
                <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Дизайн-система" }]} />
                <h3 className="mt-8 text-heading font-medium">Місце<br />для речей.</h3>
                <p className="mt-6 max-w-sm text-sm leading-7 text-muted">Співвідношення кадру 3:4. Стримані мітки. Назва й ціна без візуального шуму. На мобільному — дві колонки, на широкому екрані — чотири.</p>
                <div className="mt-8 border-l-2 border-denim pl-4 text-xs leading-6 text-muted">Ілюстрації створено для дизайн-системи. Це не фотографії та не реальні товари. Демонстраційні ціни в гривнях.</div>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-4 sm:gap-6">
                {[false, true].map((light, index) => <article key={String(light)} aria-label={`Зразок картки ${index + 1}`}>
                  <div className="relative aspect-[3/4] overflow-hidden bg-canvas"><div className="absolute top-3 left-3 z-10"><Badge tone={light ? "neutral" : "denim"}>{light ? "Зразок 02" : "Зразок 01"}</Badge></div><DenimStudy light={light} /></div>
                  <div className="mt-4 flex items-center gap-2" aria-label={light ? "Колір: світло-синій" : "Колір: темно-синій"}><span className={`h-3 w-3 rounded-full border border-control ${light ? "bg-denim-wash" : "bg-denim"}`} /><span className="text-[10px] text-muted">{light ? "Світло-синій" : "Темно-синій"}</span></div>
                  <h4 className="mt-2 text-sm font-medium">{light ? "Вільний силует" : "Прямий силует"}</h4>
                  <div className="mt-2"><Price amountMinor={light ? 179900 : 149900} /></div>
                </article>)}
              </div>
            </div>
          </section>

          <aside className="mb-10 flex flex-wrap justify-between gap-4 border-t border-ink pt-6 text-xs leading-6 text-muted">
            <p>KOS JEANS / Дизайн-система 01.0</p><p>Тестова версія · Магазин ще у розробці</p>
          </aside>
        </div>
      </main>
    </>
  );
}
