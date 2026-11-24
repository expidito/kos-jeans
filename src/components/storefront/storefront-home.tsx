"use client";

import Image from "next/image";
import { useState } from "react";
import type { DemoCollection, DemoProduct, NavigationNode } from "@/lib/storefront";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { TextField } from "@/components/ui/text-field";
import { StoreHeader } from "./store-header";
import { Modal } from "./modal";
import { Icon } from "./icon";

type PhotoCredit = { file: string; source: string; license: string };
type Props = {
  navigation: NavigationNode[];
  menuImages: Record<string, string>;
  products: DemoProduct[];
  categories: DemoCollection[];
  collectionProducts: Record<string, string[]>;
  photoCredits: PhotoCredit[];
};
type Overlay = { type: "collection"; id: string; title: string } | { type: "product"; product: DemoProduct } | { type: "search" } | { type: "basket" } | { type: "credits" } | { type: "information"; title: string };

const cta = "inline-flex min-h-12 items-center justify-center gap-6 border border-ink bg-ink px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-graphite";

function ProductCard({ product, onSelect, compact = false }: { product: DemoProduct; onSelect: () => void; compact?: boolean }) {
  const discount = product.previousMinor && Math.round((1 - product.amountMinor / product.previousMinor) * 100);
  return <article className="min-w-0">
    <button type="button" onClick={onSelect} aria-label={`Переглянути демозразок: ${product.name}`} className="group relative block aspect-[3/4] w-full overflow-hidden bg-canvas text-left">
      <Image src={product.image} alt={product.alt} fill sizes={compact ? "(max-width: 640px) 42vw, 300px" : "(max-width: 768px) 45vw, (max-width: 1280px) 30vw, 23vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
      <span className="absolute top-3 left-3"><Badge>Демо</Badge></span>
      {discount && <span className="absolute top-3 right-3"><Badge tone="sale">−{discount}%</Badge></span>}
      <span className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center bg-paper/95 text-ink"><Icon name="arrow" width={17} height={17} /></span>
    </button>
    <p className="mt-4 text-[10px] tracking-[0.12em] text-muted uppercase">{product.collection}</p>
    <h3 className="mt-1.5 text-sm leading-6 font-medium">{product.name}</h3>
    <p className="mb-2 text-xs leading-6 text-muted">{product.color}</p>
    <Price amountMinor={product.amountMinor} previousMinor={product.previousMinor} />
  </article>;
}

function SectionHeading({ label, title, note, href, linkLabel }: { label: string; title: string; note: string; href?: string; linkLabel?: string }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-5 sm:mb-10">
    <div><p className="mb-3 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">{label}</p><h2 className="text-heading font-medium">{title}</h2><p className="mt-4 max-w-lg text-xs leading-6 text-muted">{note}</p></div>
    {href && <a href={href} className="flex min-h-11 items-center gap-5 text-xs font-semibold underline underline-offset-8 hover:text-denim">{linkLabel}<Icon name="arrow" width={17} height={17} /></a>}
  </div>;
}

export function StorefrontHome({ navigation, menuImages, products, categories, collectionProducts, photoCredits }: Props) {
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [search, setSearch] = useState("");
  const close = () => setOverlay(null);
  const selectCollection = (id: string, title: string) => setOverlay({ type: "collection", id, title });
  const selectProduct = (product: DemoProduct) => setOverlay({ type: "product", product });
  const selectedProducts = overlay?.type === "collection" ? products.filter((product) => collectionProducts[overlay.id]?.includes(product.id)) : [];
  const normalizedSearch = search.trim().normalize("NFKC").toLocaleLowerCase("uk-UA");
  const results = normalizedSearch ? products.filter((product) => `${product.name} ${product.collection} ${product.color}`.toLocaleLowerCase("uk-UA").includes(normalizedSearch)) : products.slice(0, 3);
  const title = !overlay ? "" : overlay.type === "collection" ? overlay.title : overlay.type === "product" ? overlay.product.name : overlay.type === "search" ? "Пошук у демодобірці" : overlay.type === "basket" ? "Кошик / Демоверсія" : overlay.type === "credits" ? "Фотографії та ліцензії" : overlay.title;

  return <>
    <div className="bg-denim-dark px-4 py-2.5 text-center text-[10px] leading-4 font-medium tracking-[0.05em] text-paper sm:text-[11px]">Демонстраційна версія <span aria-hidden="true" className="mx-2">/</span> Покупки ще недоступні</div>
    <StoreHeader navigation={navigation} menuImages={menuImages} onSelect={(node) => selectCollection(node.id, node.label)} onSearch={() => { setSearch(""); setOverlay({ type: "search" }); }} onBasket={() => setOverlay({ type: "basket" })} />
    <main id="main-content" tabIndex={-1}>
      <section aria-labelledby="hero-title" className="bg-canvas">
        <div className="mx-auto grid max-w-store lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col items-start justify-between px-page py-10 sm:py-14 lg:py-16">
            <p className="mb-8 text-[10px] font-semibold tracking-[0.16em] uppercase sm:mb-12">KOS JEANS / Денім поза часом</p>
            <div><h1 id="hero-title" className="text-display font-medium">Твій ритм.<br />Твій денім.</h1><p className="mt-6 max-w-sm text-sm leading-7 text-graphite sm:text-base">Прості форми, сильний характер.<br />Новий погляд на щоденний гардероб.</p>
              <a href="#collection" className={`${cta} mt-8`}>Переглянути колекцію<Icon name="arrow" width={18} /></a>
            </div>
            <div className="mt-9 flex w-full items-center justify-between gap-4 border-t border-control/40 pt-5 text-[10px] tracking-wider text-muted uppercase lg:mt-14"><span>Для неї та для нього</span><span>Демоколекція / 01</span></div>
          </div>
          <div className="relative h-[440px] overflow-hidden sm:h-[560px] lg:h-auto lg:min-h-[660px]">
            <Image src="/images/storefront/hero.jpg" alt="Фотоілюстрація для KOS JEANS: джинсова куртка в міському образі" fill preload sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover object-[50%_35%]" />
            <p className="absolute right-5 bottom-5 bg-ink/70 px-3 py-2 text-[9px] tracking-wider text-paper uppercase">Фотоілюстрація / Brooke Cagle · Unsplash</p>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-store px-page">
        <section id="collection" className="scroll-mt-28 py-section" aria-label="Добірки для жінок та чоловіків">
          <SectionHeading label="01 / Знайди своє" title="Два настрої. Один характер." note="Обирай напрям і знайомся з візуальними зразками майбутнього магазину." />
          <div className="grid gap-5 md:grid-cols-2">
            {[{ id: "women", label: "Для неї", image: "women", note: "Легкість бути собою" }, { id: "men", label: "Для нього", image: "men", note: "У власному ритмі" }].map((edit) => <button id={edit.id} key={edit.id} type="button" onClick={() => selectCollection(edit.id, edit.label)} className="group relative min-h-[420px] scroll-mt-28 overflow-hidden bg-canvas text-left sm:min-h-[540px]">
              <Image src={`/images/storefront/${edit.image}.jpg`} alt={edit.id === "women" ? "Жіночий образ з джинсовою курткою" : "Чоловічий образ з джинсовою курткою"} fill sizes="(max-width: 768px) 90vw, 47vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-7 text-paper sm:p-9"><span><span className="block text-[10px] tracking-[0.14em] uppercase">{edit.note}</span><span className="mt-3 block text-4xl font-medium tracking-[-0.04em] sm:text-5xl">{edit.label}</span><span className="mt-4 block text-xs">Переглянути демозразки</span></span><span className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/60"><Icon name="arrow" /></span></span>
            </button>)}
          </div>
        </section>
        <section id="new-arrivals" className="scroll-mt-28 pb-section" aria-label="Новинки">
          <SectionHeading label="02 / Новий погляд" title="Новинки" note="Демонстраційні фото та ціни. Це приклад майбутньої добірки, не доступний до купівлі асортимент." href="#categories" linkLabel="Обрати категорію" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 sm:gap-x-6">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} onSelect={() => selectProduct(product)} />)}</div>
        </section>
        <section id="categories" className="scroll-mt-28 border-t border-line py-section" aria-label="Категорії одягу">
          <SectionHeading label="03 / Основа гардероба" title="Почни з головного." note="Форма, фактура, твій вибір. Кожна категорія відкриває демонстраційну добірку." />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-6">{categories.map((category) => <button type="button" key={category.id} onClick={() => selectCollection(category.id, category.label)} className="group text-left">
            <span className="relative block aspect-[4/5] overflow-hidden bg-canvas"><Image src={category.image} alt={category.alt} fill sizes="(max-width: 1024px) 45vw, 23vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" /></span>
            <span className="mt-4 flex min-h-11 items-center justify-between gap-3 border-b border-line pb-3 text-sm font-medium">{category.label}<Icon name="arrow" width={17} height={17} /></span>
          </button>)}</div>
        </section>
      </div>
      <section id="denim" className="scroll-mt-28 bg-denim-dark text-paper" aria-label="Акцент на денімі">
        <div className="mx-auto grid max-w-store md:grid-cols-2">
          <div className="relative min-h-80 overflow-hidden md:min-h-[560px]"><Image src="/images/storefront/detail.jpg" alt="Деталь переплетення та шва джинсової тканини" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div>
          <div className="flex flex-col items-start justify-center px-page py-14 lg:py-20"><p className="mb-8 text-[10px] tracking-[0.16em] uppercase text-white/80">KOS / Дослідження деніму</p><h2 className="text-heading font-medium">Один матеріал.<br />Безліч силуетів.</h2><p className="mt-6 max-w-sm text-sm leading-7 text-white/85">Від світлих відтінків до глибокого індиго. Від стриманої класики до вільних форм. Знайомся з мовою деніму.</p><button type="button" onClick={() => selectCollection("jeans", "Джинси / Демозразки")} className="mt-8 inline-flex min-h-12 items-center gap-8 border border-paper px-6 py-3 text-sm font-medium hover:bg-paper hover:text-denim-dark">Знайти свій денім<Icon name="arrow" width={18} /></button></div>
        </div>
      </section>
      <div className="mx-auto max-w-store px-page">
        <section id="popular" className="scroll-mt-28 py-section" aria-label="Популярні товари">
          <SectionHeading label="04 / У центрі уваги" title="Популярні товари" note="Приклад редакційної добірки. Демозразки не відображають реальний рейтинг продажів." />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">{[products[5], products[2], products[3], products[4]].map((product) => <ProductCard key={product.id} product={product} onSelect={() => selectProduct(product)} />)}</div>
        </section>
        <section id="sale" className="grid scroll-mt-28 gap-10 border-t border-line py-section lg:grid-cols-[1fr_1.4fr] lg:gap-20" aria-label="Розпродаж">
          <div className="flex flex-col items-start justify-between"><div><p className="mb-5 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">05 / Інша ціна. Той самий настрій.</p><h2 className="text-heading font-medium">Розпродаж</h2><p className="mt-6 max-w-sm text-sm leading-7 text-muted">Приклад акційної добірки. Ціни, знижки та фото — демонстраційні. Реальні пропозиції з’являться після запуску магазину.</p></div><div className="relative mt-8 hidden h-44 w-full overflow-hidden lg:block"><Image src="/images/storefront/folded.jpg" alt="Складені джинси різних відтінків — фотоілюстрація" fill sizes="400px" className="object-cover" /></div></div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">{products.filter((product) => product.previousMinor).map((product) => <ProductCard key={product.id} product={product} compact onSelect={() => selectProduct(product)} />)}</div>
        </section>
        <section id="about" className="grid scroll-mt-28 gap-8 border-t border-ink py-section md:grid-cols-[1fr_2fr] md:gap-16" aria-labelledby="about-title">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">KOS JEANS / Про нас</p>
          <div><h2 id="about-title" className="max-w-3xl text-heading font-medium">Менше зайвого.<br />Більше тебе.</h2><div className="mt-8 grid gap-6 text-sm leading-7 text-muted sm:grid-cols-2"><p>KOS JEANS — майбутній простір для деніму та повсякденного одягу. В основі нашого погляду — прості форми, виразні фактури та свобода поєднувати.</p><p>Ми створюємо магазин, у якому легко знайти свій силует. Поки триває розробка, тут можна познайомитися з візуальним напрямом бренду.</p></div></div>
        </section>
      </div>
    </main>
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-store px-page py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div><a href="#main-content" className="text-3xl font-extrabold tracking-[-0.065em]">KOS JEANS<span className="ml-1 text-white/60">/</span></a><p className="mt-5 max-w-xs text-sm leading-7 text-white/70">Твій ритм. Твій денім.<br />Демонстраційний магазин у розробці.</p></div>
          <div><h2 className="mb-4 text-[10px] font-semibold tracking-widest uppercase text-white/60">Колекції</h2><ul className="space-y-1 text-xs">{[{ label: "Жінкам", href: "#women" }, { label: "Чоловікам", href: "#men" }, { label: "Новинки", href: "#new-arrivals" }, { label: "Розпродаж", href: "#sale" }].map((link) => <li key={link.href}><a href={link.href} className="inline-flex min-h-11 items-center hover:underline">{link.label}</a></li>)}</ul></div>
          <div><h2 className="mb-4 text-[10px] font-semibold tracking-widest uppercase text-white/60">Інформація</h2><ul className="space-y-1 text-xs"><li><a href="#about" className="inline-flex min-h-11 items-center hover:underline">Про KOS JEANS</a></li><li><button type="button" onClick={() => setOverlay({ type: "information", title: "Доставка та повернення" })} className="min-h-11 text-left hover:underline">Доставка та повернення</button></li><li><button type="button" onClick={() => setOverlay({ type: "credits" })} className="min-h-11 text-left hover:underline">Фотографії та ліцензії</button></li></ul></div>
          <div><h2 className="mb-4 text-[10px] font-semibold tracking-widest uppercase text-white/60">Залишаймося на зв’язку</h2><p className="text-xs leading-7 text-white/70">Офіційні контакти й соціальні мережі з’являться перед запуском.</p><p className="mt-3 text-xs leading-7 text-white/70">Поки що ми не приймаємо замовлень.</p></div>
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-white/20 pt-6 text-[10px] leading-5 text-white/60"><p>© KOS JEANS</p><p>Українська / UAH ₴ <span aria-hidden="true" className="mx-2">·</span> Demo / 01</p></div>
      </div>
    </footer>
    <Modal open={overlay !== null} onClose={close} title={title}>
      {overlay?.type === "collection" && <><p className="mb-7 text-xs leading-6 text-muted">Демонстраційна категорія. Фото та ціни — візуальні зразки, не реальні пропозиції магазину.</p>{selectedProducts.length ? <div className="grid grid-cols-2 gap-5">{selectedProducts.map((product) => <div key={product.id}><div className="relative aspect-[3/4] bg-canvas"><Image src={product.image} alt={product.alt} fill sizes="(max-width: 640px) 40vw, 300px" className="object-cover" /></div><h3 className="mt-3 text-sm font-medium">{product.name}</h3><div className="mt-2"><Price amountMinor={product.amountMinor} /></div><p className="mt-2 text-[10px] text-muted">Демозразок · не продається</p></div>)}</div> : <div className="border border-line bg-canvas p-7"><p className="text-lg font-medium">Зразки ще готуються.</p><p className="mt-3 text-sm leading-7 text-muted">Для цієї категорії немає демонстраційних зразків. Реальний асортимент з’явиться після підключення магазину.</p></div>}</>}
      {overlay?.type === "product" && <div className="grid gap-7 sm:grid-cols-2"><div className="relative aspect-[3/4] bg-canvas"><Image src={overlay.product.image} alt={overlay.product.alt} fill sizes="(max-width: 640px) 80vw, 300px" className="object-cover" /></div><div><Badge tone="denim">Візуальний зразок</Badge><p className="mt-5 text-sm leading-7 text-muted">Фотографія ілюструє стиль, а не конкретний товар KOS JEANS. Назва й ціна демонстраційні.</p><div className="mt-6"><Price amountMinor={overlay.product.amountMinor} previousMinor={overlay.product.previousMinor} /></div><p className="mt-6 border-t border-line pt-5 text-xs leading-6 text-muted">Розміри, склад, наявність і купівля поки не підключені. Це вікно не створює замовлення.</p></div></div>}
      {overlay?.type === "search" && <><TextField id="demo-search" label="Що шукаємо?" placeholder="Наприклад, куртка або білий" value={search} onChange={(event) => setSearch(event.target.value)} hint="Пошук працює лише серед демонстраційних зразків цієї сторінки." /><p role="status" className="mt-5 text-xs text-muted">{normalizedSearch ? `Знайдено демозразків: ${results.length}` : "Кілька зразків для знайомства"}</p><div className="mt-5 divide-y divide-line">{results.map((product) => <div key={product.id} className="flex items-center gap-4 py-4"><div className="relative h-24 w-20 shrink-0 bg-canvas"><Image src={product.image} alt={product.alt} fill sizes="80px" className="object-cover" /></div><div><h3 className="text-sm font-medium">{product.name}</h3><p className="my-1 text-xs text-muted">{product.color} · Демо</p><Price amountMinor={product.amountMinor} /></div></div>)}{!results.length && <p className="bg-canvas p-5 text-sm leading-7 text-muted">Нічого не знайдено. Спробуйте «джинс», «куртка» або «білий».</p>}</div></>}
      {overlay?.type === "basket" && <><p className="text-2xl font-medium tracking-tight">Знайомство починається з колекції.</p><p className="mt-5 text-sm leading-7 text-muted">Кошик і оформлення замовлення ще не підключені. На цій сторінці неможливо придбати товар або здійснити оплату.</p><a href="#collection" onClick={close} className={`${cta} mt-7`}>Переглянути демоколекцію<Icon name="arrow" width={18} /></a></>}
      {overlay?.type === "information" && <p className="text-sm leading-8 text-muted">Магазин ще не приймає замовлень. Умови доставки, оплати, обміну та повернення будуть погоджені власником і опубліковані перед запуском. Строки та реквізити зараз не визначені.</p>}
      {overlay?.type === "credits" && <><p className="mb-5 text-sm leading-7 text-muted">Фотоілюстрації отримані з Unsplash і використовуються за безкоштовною Unsplash License. Вони не є фотографіями реального асортименту KOS JEANS.</p><ul className="divide-y divide-line text-xs">{photoCredits.map((credit) => <li key={credit.file} className="flex flex-wrap justify-between gap-3 py-4"><a href={credit.source} target="_blank" rel="noreferrer" className="underline underline-offset-4">{credit.file.split("/").pop()} / Unsplash ↗</a><a href={credit.license} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-4">Ліцензія</a></li>)}</ul></>}
    </Modal>
  </>;
}
