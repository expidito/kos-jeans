"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/store";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { NavigationNode } from "@/lib/storefront";
import { Icon } from "./icon";
import { Modal } from "./modal";

type Props = {
  catalogMode?: boolean;
  navigation: NavigationNode[];
  menuImages: Record<string, string>;
  onSelect: (node: NavigationNode) => void;
  onSearch: () => void;
};

function DesktopBranch({
  node,
  onSelect,
  level = 0,
}: {
  node: NavigationNode;
  onSelect: Props["onSelect"];
  level?: number;
}) {
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(node)}
        className={`min-h-11 break-words py-2 text-left hover:text-denim ${level ? "text-xs text-muted" : "text-sm font-semibold"}`}
      >
        {node.label}
      </button>
      {node.children.length > 0 && (
        <div className={level ? "border-l border-line pl-3" : ""}>
          {node.children.map((child) => (
            <DesktopBranch
              key={child.id}
              node={child}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileBranch({
  node,
  onSelect,
  catalogMode,
}: {
  node: NavigationNode;
  onSelect: Props["onSelect"];
  catalogMode?: boolean;
}) {
  if (!node.children.length)
    return (
      <button
        type="button"
        onClick={() => onSelect(node)}
        className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-sm hover:text-denim"
      >
        {node.label}
        <Icon name="arrow" width={16} height={16} />
      </button>
    );
  return (
    <details className="border-b border-line [&[open]>summary>svg]:rotate-180">
      <summary className="flex min-h-14 list-none items-center justify-between gap-4 py-4 text-base font-medium [&::-webkit-details-marker]:hidden">
        {node.label}
        <Icon name="chevron" className="transition-transform" width={16} />
      </summary>
      <div className="border-l border-line pb-4 pl-4">
        <button
          type="button"
          className="min-h-12 py-3 text-left text-xs font-semibold text-denim underline underline-offset-4"
          onClick={() => onSelect(node)}
        >
          {catalogMode ? "Усі товари" : "Усі демозразки"}:{" "}
          {node.label.toLowerCase()}
        </button>
        {node.children.map((child) => (
          <MobileBranch
            key={child.id}
            node={child}
            onSelect={onSelect}
            catalogMode={catalogMode}
          />
        ))}
      </div>
    </details>
  );
}

export function StoreHeader({
  navigation,
  menuImages,
  onSelect,
  onSearch,
  catalogMode = false,
}: Props) {
  const { items } = useCart();
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);
  const [desktop, setDesktop] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const header = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusPanel = useRef(false);
  const active = navigation.find((node) => node.id === desktop);

  useEffect(() => {
    if (!desktop) return;
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setDesktop(null);
    };
    document.addEventListener("pointerdown", outside);
    if (focusPanel.current) {
      panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
      focusPanel.current = false;
    }
    return () => document.removeEventListener("pointerdown", outside);
  }, [desktop]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const resize = () => {
      if (query.matches) setMobile(false);
      else setDesktop(null);
    };
    query.addEventListener("change", resize);
    return () => query.removeEventListener("change", resize);
  }, []);

  const select = (node: NavigationNode) => {
    // The selected item leaves the DOM when the mega-menu closes. Keep a live
    // return-focus target for the category dialog.
    if (desktop) triggers.current[desktop]?.focus();
    setDesktop(null);
    setMobile(false);
    onSelect(node);
  };

  return (
    <header
      ref={header}
      className="sticky top-0 z-30 border-b border-line bg-paper"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setDesktop(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && desktop) {
          setDesktop(null);
          triggers.current[desktop]?.focus();
        }
      }}
    >
      <div className="mx-auto flex h-20 max-w-store items-center justify-between gap-3 px-page lg:h-24">
        <button
          type="button"
          aria-label="Відкрити меню"
          aria-expanded={mobile}
          aria-controls="mobile-navigation-content"
          onClick={() => setMobile(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center lg:hidden"
        >
          <Icon name="menu" />
        </button>
        <Link
          href="/"
          aria-label="KOS JEANS — головна"
          className="whitespace-nowrap text-[23px] font-extrabold tracking-[-0.065em] sm:text-3xl"
        >
          KOS JEANS<span className="ml-1 text-denim">/</span>
        </Link>
        <nav
          aria-label="Головна навігація"
          className="hidden h-full items-center gap-7 text-xs font-semibold xl:gap-10 lg:flex"
        >
          {navigation.map((node) => (
            <button
              key={node.id}
              ref={(element) => {
                triggers.current[node.id] = element;
              }}
              type="button"
              aria-expanded={desktop === node.id}
              aria-controls="desktop-mega-menu"
              onClick={(event) => {
                focusPanel.current = event.detail === 0;
                setDesktop(desktop === node.id ? null : node.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  if (desktop === node.id)
                    panel.current
                      ?.querySelector<HTMLButtonElement>("button")
                      ?.focus();
                  else {
                    focusPanel.current = true;
                    setDesktop(node.id);
                  }
                }
              }}
              className={`flex h-full items-center gap-2 border-b-2 ${desktop === node.id ? "border-ink" : "border-transparent"} hover:text-denim`}
            >
              {node.label}
              <Icon name="chevron" width={12} height={12} />
            </button>
          ))}
          <Link
            prefetch={false}
            href="/catalog"
            className="flex min-h-11 items-center hover:text-denim"
          >
            Каталог
          </Link>
          <Link
            prefetch={false}
            href={catalogMode ? "/catalog?new=1" : "#new-arrivals"}
            className="flex h-full items-center hover:text-denim"
            onClick={() => setDesktop(null)}
          >
            Новинки
          </Link>
          <Link
            prefetch={false}
            href={catalogMode ? "/catalog?sale=1" : "#sale"}
            className="flex h-full items-center hover:text-denim"
            onClick={() => setDesktop(null)}
          >
            Розпродаж
          </Link>
        </nav>
        <div className="flex items-center gap-0 sm:gap-3">
          <button
            type="button"
            aria-label={catalogMode ? "Пошук товарів" : "Пошук у демодобірці"}
            onClick={() => {
              setDesktop(null);
              onSearch();
            }}
            className="flex h-11 w-11 items-center justify-center hover:text-denim"
          >
            <Icon name="search" />
          </button>
          <Link
            prefetch={false}
            href="/cart"
            aria-label={`Кошик, товарів: ${cartCount}`}
            className="relative flex h-11 w-11 items-center justify-center hover:text-denim"
          >
            <Icon name="bag" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0 right-0 min-w-5 bg-ink px-1 py-0.5 text-center text-[10px] text-paper"
              >
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div
        id="desktop-mega-menu"
        hidden={!active}
        ref={panel}
        className="absolute inset-x-0 top-full border-y border-line bg-paper shadow-xl shadow-ink/5"
      >
        {active && (
          <div
            className={`mx-auto grid max-w-store ${catalogMode ? "grid-cols-1" : "grid-cols-[1fr_280px]"} gap-16 px-page py-9`}
          >
            <div>
              <div className="mb-7 flex items-center justify-between gap-4 border-b border-line pb-5">
                <p className="text-xs uppercase tracking-widest text-muted">
                  {active.label} / Категорії
                </p>
                <button
                  type="button"
                  onClick={() => select(active)}
                  className="text-xs font-semibold underline underline-offset-4"
                >
                  {catalogMode ? "Усі товари ↗" : "Усі демозразки ↗"}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-x-10 gap-y-6">
                {active.children.map((node) => (
                  <DesktopBranch key={node.id} node={node} onSelect={select} />
                ))}
              </div>
            </div>
            {!catalogMode && (
              <div className="relative min-h-64 overflow-hidden bg-canvas">
                {menuImages[active.id] && (
                  <Image
                    src={menuImages[active.id]}
                    alt=""
                    fill
                    sizes="280px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-ink/70 px-5 py-4 text-paper">
                  <p className="text-xl tracking-tight">
                    Денім у твоєму ритмі.
                  </p>
                  <p className="mt-2 text-[10px]">
                    Фотоілюстрація · демоверсія
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        open={mobile}
        onClose={() => setMobile(false)}
        title="KOS JEANS / Меню"
        drawer
      >
        <div id="mobile-navigation-content">
          <Link
            prefetch={false}
            href="/catalog"
            onClick={() => setMobile(false)}
            className="mb-5 flex min-h-12 items-center border-b border-line text-sm font-semibold"
          >
            Всі товари ↗
          </Link>
          <p className="mb-6 text-xs leading-6 text-muted">
            {catalogMode
              ? "Категорії з каталогу. Купівля ще недоступна."
              : "Демонстраційні категорії. Купівля ще недоступна."}
          </p>
          {navigation.map((node) => (
            <MobileBranch
              key={node.id}
              node={node}
              onSelect={select}
              catalogMode={catalogMode}
            />
          ))}
          <Link
            prefetch={false}
            href={catalogMode ? "/catalog?new=1" : "#new-arrivals"}
            onClick={() => setMobile(false)}
            className="flex min-h-14 items-center border-b border-line text-base font-medium"
          >
            Новинки <span className="ml-auto">↗</span>
          </Link>
          <Link
            prefetch={false}
            href={catalogMode ? "/catalog?sale=1" : "#sale"}
            onClick={() => setMobile(false)}
            className="flex min-h-14 items-center border-b border-line text-base font-medium"
          >
            Розпродаж <span className="ml-auto">↗</span>
          </Link>
          <Link
            prefetch={false}
            href={catalogMode ? "/#about" : "#about"}
            onClick={() => setMobile(false)}
            className="mt-7 flex min-h-12 items-center text-sm text-muted"
          >
            Про KOS JEANS
          </Link>
        </div>
      </Modal>
    </header>
  );
}
