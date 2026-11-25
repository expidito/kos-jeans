"use client";
import Link from "next/link";
import { addToCart } from "@/lib/cart/store";
import { useState } from "react";
import { SizeSelector } from "@/components/ui/size-selector";
import { Button } from "@/components/ui/button";
import {
  variantColors,
  variantSizes,
  findVariant,
  cartSelection,
  type ProductVariant,
} from "@/lib/product/variants";

export function VariantPicker({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariant[];
}) {
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(""),
    [added, setAdded] = useState(false);
  const colors = variantColors(variants);
  const [color, setColor] = useState(
    variants.find((v) => v.is_active && v.stock > 0)?.color || colors[0] || "",
  );
  const [size, setSize] = useState(""),
    [quantity, setQuantity] = useState(1);
  const sizes = variantSizes(variants, color),
    variant = findVariant(variants, color, size);
  const selection = cartSelection(productId, variant, quantity);
  return (
    <section
      aria-label="Вибір варіанта"
      className="mt-8 border-t border-line pt-7"
      data-selected-variant={selection?.variantId ?? ""}
    >
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">
          Колір <span className="ml-2 font-normal text-muted">{color}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="product-color"
                value={c}
                checked={color === c}
                onChange={() => {
                  setColor(c);
                  setSize("");
                  setQuantity(1);
                }}
                className="peer sr-only"
                aria-label={c}
              />
              <span className="flex min-h-12 items-center border border-control px-4 text-xs peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-denim">
                {c}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-7">
        <SizeSelector
          name="product-size"
          options={sizes}
          value={size}
          onChange={(s) => {
            if (findVariant(variants, color, s)) {
              setSize(s);
              setQuantity(1);
            }
          }}
        />
      </div>
      <p className="mt-3 text-xs leading-6 text-muted">
        Закреслені розміри недоступні у вибраному кольорі.
      </p>
      <ul
        aria-label="Наявність за розмірами"
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] leading-6 text-muted"
      >
        {variants
          .filter((v) => v.is_active && v.color === color)
          .map((v) => (
            <li key={v.id}>
              {v.size}: {v.stock > 0 ? `${v.stock} шт.` : "немає в наявності"}
            </li>
          ))}
      </ul>
      <p role="status" className="mt-5 break-words text-sm leading-6">
        {!colors.length
          ? "Варіанти товару поки недоступні."
          : variant
            ? `У наявності: ${variant.stock} шт. · Артикул варіанта: ${variant.sku}`
            : variants.some((v) => v.color === color && v.stock > 0)
              ? "Оберіть доступний розмір."
              : "Цього кольору немає в наявності."}
      </p>
      <label className="mt-5 flex items-center gap-4 text-xs">
        Кількість
        <input
          type="number"
          min={1}
          max={variant?.stock ?? 1}
          step={1}
          disabled={!variant}
          value={quantity}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (variant && Number.isInteger(n) && n >= 1 && n <= variant.stock)
              setQuantity(n);
          }}
          className="min-h-12 w-20 border border-control px-3 disabled:bg-canvas"
        />
      </label>
      <div className="mt-6">
        <Button
          disabled={!selection || busy}
          className="w-full"
          onClick={async () => {
            if (!selection || busy) return;
            setBusy(true);
            setAdded(false);
            setFeedback("");
            try {
              await addToCart(selection.variantId, selection.quantity);
              setAdded(true);
              setFeedback("Товар додано до кошика.");
            } catch (e) {
              setFeedback(
                e instanceof Error ? e.message : "Не вдалося додати товар.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Перевіряємо наявність…" : "Додати в кошик"}
        </Button>
        <div role="status" className="mt-3 text-sm leading-6">
          {feedback}
          {added && (
            <Link
              href="/cart"
              className="mt-2 block min-h-11 font-semibold underline"
            >
              Перейти до кошика ↗
            </Link>
          )}
        </div>
        <p className="mt-2 text-xs leading-6 text-muted">
          Додавання не резервує товар. Оформлення замовлення ще недоступне.
        </p>
      </div>
    </section>
  );
}
