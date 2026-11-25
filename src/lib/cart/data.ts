import "server-only";
import { publicCatalogClient } from "@/lib/catalog/data";
import { resolveRows, type CartItem, type ResolvedVariant } from "./model";
export async function resolveCart(items: CartItem[]) {
  const client = publicCatalogClient();
  if (!client) throw Error("Каталог тимчасово недоступний.");
  if (!items.length) return [];
  const variants = await client
    .from("product_variants")
    .select(
      "id,product_id,size,color,stock,is_active,products!inner(id,name,slug,price_kopecks)",
    )
    .in(
      "id",
      items.map((i) => i.variantId),
    );
  if (variants.error) throw Error("Не вдалося перевірити кошик.");
  const productIds = [
    ...new Set((variants.data ?? []).map((v) => v.product_id)),
  ];
  let images: { id: string; product_id: string }[] = [];
  if (productIds.length) {
    const result = await client
      .from("product_images")
      .select("id,product_id")
      .in("product_id", productIds)
      .order("is_primary", { ascending: false })
      .order("sort_order")
      .order("id");
    if (result.error) throw Error("Не вдалося перевірити кошик.");
    images = result.data ?? [];
  }
  return resolveRows(
    items,
    variants.data as unknown as ResolvedVariant[],
    images,
  );
}
