import type { Metadata } from "next";
import { CatalogShell } from "@/components/catalog/catalog-shell";
import { getCategories, categoryTree } from "@/lib/catalog/data";
import { checkoutConfigured } from "@/lib/checkout/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Оформлення замовлення",
  robots: { index: false, follow: false },
};
export default async function CheckoutPage() {
  return (
    <CatalogShell navigation={categoryTree(await getCategories())}>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-store px-page py-8 sm:py-12"
      >
        <p className="mb-4 text-[10px] tracking-widest text-denim">
          ТЕСТОВЕ ОФОРМЛЕННЯ / KOS JEANS
        </p>
        <h1 className="mb-9 text-heading">Оформлення замовлення</h1>
        <CheckoutForm configured={checkoutConfigured()} />
      </main>
    </CatalogShell>
  );
}
