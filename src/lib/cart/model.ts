export const MAX_LINES = 50,
  MAX_QUANTITY = 99;
export type CartItem = { variantId: string; quantity: number };
export type CartRow = CartItem & {
  status: "available" | "shortage" | "unavailable";
  productId?: string;
  name?: string;
  slug?: string;
  size?: string;
  color?: string;
  price?: number;
  imageId?: string | null;
  stock?: number;
};
export const variantIdValid = (id: unknown): id is string =>
  typeof id === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
    id,
  );
export function cartInput(value: unknown): CartItem[] {
  if (!Array.isArray(value) || value.length > MAX_LINES)
    throw Error("У кошику може бути до 50 позицій.");
  const ids = new Set<string>();
  return value.map((v) => {
    if (
      !v ||
      typeof v !== "object" ||
      !variantIdValid(v.variantId) ||
      !Number.isInteger(v.quantity) ||
      v.quantity < 1 ||
      v.quantity > MAX_QUANTITY ||
      ids.has(v.variantId)
    )
      throw Error("Перевірте варіанти та кількість (від 1 до 99).");
    ids.add(v.variantId);
    return { variantId: v.variantId, quantity: v.quantity };
  });
}
export function storedCart(text: string | null): CartItem[] {
  if (!text || text.length > 12000) return [];
  try {
    const data = JSON.parse(text);
    if (data.version !== 1 || !Array.isArray(data.items)) return [];
    return cartInput(data.items);
  } catch {
    return [];
  }
}
export type ResolvedVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock: number;
  is_active: boolean;
  products: { id: string; name: string; slug: string; price_kopecks: number };
};
export function resolveRows(
  items: CartItem[],
  variants: ResolvedVariant[],
  images: { product_id: string; id: string }[],
): CartRow[] {
  return items.map((item) => {
    const v = variants.find((v) => v.id === item.variantId && v.is_active);
    if (!v || v.products.id !== v.product_id)
      return { ...item, status: "unavailable" };
    return {
      ...item,
      productId: v.product_id,
      name: v.products.name,
      slug: v.products.slug,
      size: v.size,
      color: v.color,
      price: v.products.price_kopecks,
      imageId: images.find((i) => i.product_id === v.product_id)?.id ?? null,
      stock: v.stock,
      status:
        v.stock < 1
          ? "unavailable"
          : v.stock < item.quantity
            ? "shortage"
            : "available",
    };
  });
}
export function cartTotal(rows: CartRow[]) {
  return rows.reduce(
    (total, row) =>
      total +
      (row.status !== "unavailable" && row.price !== undefined
        ? row.price * row.quantity
        : 0),
    0,
  );
}
export function increased(
  items: CartItem[],
  variantId: string,
  quantity: number,
  stock: number,
) {
  if (!variantIdValid(variantId) || !Number.isInteger(quantity) || quantity < 1)
    throw Error("Оберіть доступний варіант.");
  const current = items.find((i) => i.variantId === variantId),
    next = (current?.quantity ?? 0) + quantity;
  if (next > Math.min(stock, MAX_QUANTITY))
    throw Error(
      "Недостатньо залишку для цієї кількості. У кошику вже може бути цей розмір.",
    );
  if (!current && items.length >= MAX_LINES)
    throw Error("У кошику може бути до 50 позицій.");
  return current
    ? items.map((i) =>
        i.variantId === variantId ? { variantId, quantity: next } : i,
      )
    : [...items, { variantId, quantity: next }];
}
