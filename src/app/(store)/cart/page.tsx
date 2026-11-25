import type { Metadata } from "next";
import { CatalogShell } from "@/components/catalog/catalog-shell";
import { ShoppingCart } from "@/components/cart/cart-page";
import { getCategories, categoryTree } from "@/lib/catalog/data";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Кошик",
  robots: { index: false, follow: false },
};
export default async function CartPage() {
  return (
    <CatalogShell navigation={categoryTree(await getCategories())}>
      <ShoppingCart />
    </CatalogShell>
  );
}
