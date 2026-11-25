"use client";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { StoreHeader } from "@/components/storefront/store-header";
import { Modal } from "@/components/storefront/modal";
import type { NavigationNode } from "@/lib/storefront";
export function CatalogChrome({
  navigation,
  children,
  footer,
}: {
  navigation: NavigationNode[];
  children: ReactNode;
  footer: ReactNode;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"search" | null>(null);
  return (
    <>
      <div className="bg-denim-dark px-4 py-2 text-center text-[11px] text-paper">
        KOS JEANS / Магазин у розробці · Не для реальних покупок
      </div>
      <StoreHeader
        catalogMode
        navigation={navigation}
        menuImages={{}}
        onSelect={(n) => router.push(n.href)}
        onSearch={() => setDialog("search")}
      />
      {children}
      {footer}
      <Modal
        open={!!dialog}
        onClose={() => setDialog(null)}
        title="Пошук товарів"
      >
        <form action="/catalog" className="space-y-5">
          <label className="block text-sm">
            Назва товару
            <input
              name="q"
              maxLength={120}
              autoComplete="off"
              className="mt-3 min-h-12 w-full border border-control px-3"
            />
          </label>
          <button className="min-h-12 bg-ink px-6 text-paper">Знайти</button>
        </form>
      </Modal>
    </>
  );
}
