"use client";
import { useSyncExternalStore } from "react";
import { storedCart, increased, type CartItem, type CartRow } from "./model";
export const CART_KEY = "kos-jeans-cart-v1";
type Snapshot = {
  items: CartItem[];
  storageError: boolean;
  completed: string[];
};
const empty: Snapshot = { items: [], storageError: false, completed: [] };
let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();
let queue = Promise.resolve();
function read(): Snapshot {
  try {
    return {
      items: storedCart(localStorage.getItem(CART_KEY)),
      completed: completedKeys(localStorage.getItem(CART_KEY)),
      storageError: false,
    };
  } catch {
    return { items: [], storageError: true, completed: [] };
  }
}
function current() {
  return snapshot ?? (snapshot = read());
}
function emit() {
  for (const l of listeners) l();
}
function completedKeys(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? "{}").completedCheckouts;
    return Array.isArray(v)
      ? v
          .filter((x) => typeof x === "string" && /^[a-f0-9-]{36}$/.test(x))
          .slice(-20)
      : [];
  } catch {
    return [];
  }
}
function write(items: CartItem[], completed = current().completed) {
  let storageError = false;
  try {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify({ version: 1, items, completedCheckouts: completed }),
    );
  } catch {
    storageError = true;
  }
  snapshot = { items, storageError, completed };
  emit();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (e: StorageEvent) => {
    if (e.key === CART_KEY || e.key === null) {
      snapshot = read();
      emit();
    }
  };
  window.addEventListener("storage", sync);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", sync);
  };
}
export function useCart() {
  return useSyncExternalStore(subscribe, current, () => empty);
}
export async function verifyCart(
  items: CartItem[],
  signal?: AbortSignal,
): Promise<CartRow[]> {
  const response = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Error("Не вдалося звірити ціни та залишки. Спробуйте ще раз.");
  return (await response.json()).rows;
}
export function addToCart(variantId: string, quantity: number) {
  const run = queue.then(async () => {
    const rows = await verifyCart([{ variantId, quantity }]),
      row = rows[0];
    if (!row || row.status !== "available" || !row.stock)
      throw Error(
        "Обраний варіант уже недоступний або залишку недостатньо. Оновіть сторінку.",
      );
    write(increased(current().items, variantId, quantity, row.stock));
  });
  queue = run.catch(() => {});
  return run;
}
export function setCartQuantity(variantId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
  write(
    current().items.map((i) =>
      i.variantId === variantId ? { variantId, quantity } : i,
    ),
  );
}
export function removeCartItem(variantId: string) {
  write(current().items.filter((i) => i.variantId !== variantId));
}
export function clearCart() {
  write([]);
}

export function consumePurchased(key: string, purchased: CartItem[]) {
  const c = current();
  if (c.completed.includes(key)) return;
  const items = c.items
    .map((i) => ({
      ...i,
      quantity: Math.max(
        0,
        i.quantity -
          (purchased.find((p) => p.variantId === i.variantId)?.quantity ?? 0),
      ),
    }))
    .filter((i) => i.quantity > 0);
  write(items, [...c.completed.slice(-19), key]);
}
