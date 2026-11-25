"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  useCart,
  verifyCart,
  setCartQuantity,
  removeCartItem,
  clearCart,
} from "@/lib/cart/store";
import { cartTotal, MAX_QUANTITY, type CartRow } from "@/lib/cart/model";
import { formatPrice } from "@/lib/format-price";
const control =
  "inline-flex min-h-11 min-w-11 items-center justify-center border border-control bg-paper px-3 text-sm disabled:opacity-40";
export function ShoppingCart() {
  const { items, storageError } = useCart(),
    [revision, setRevision] = useState(0);
  const key = JSON.stringify(items),
    ticket = key + ":" + revision;
  const [state, setState] = useState<{
    ticket: string;
    rows: CartRow[];
    error: boolean;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const requested = JSON.parse(key);
    verifyCart(requested, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted)
          setState({ ticket, rows, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ ticket, rows: [], error: true });
      });
    return () => controller.abort();
  }, [key, ticket]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") setRevision((v) => v + 1);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const pending = state?.ticket !== ticket,
    rows = pending ? [] : (state?.rows ?? []),
    count = items.reduce((n, i) => n + i.quantity, 0);
  const blocked = rows.some((r) => r.status !== "available");
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-store px-page py-8 sm:py-14"
    >
      <nav
        aria-label="Хлібні крихти"
        className="mb-8 flex gap-3 text-xs text-muted"
      >
        <Link href="/">Головна</Link>
        <span>/</span>
        <span>Кошик</span>
      </nav>
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-[10px] tracking-widest text-denim">
            ВАШ ВИБІР / KOS JEANS
          </p>
          <h1 className="text-heading">
            Кошик <span className="text-muted">({count})</span>
          </h1>
        </div>
        <Link
          href="/catalog"
          className="inline-flex min-h-11 items-center text-xs underline"
        >
          Продовжити покупки ↗
        </Link>
      </div>
      {storageError && (
        <p role="alert" className="mb-5 border border-danger p-4 text-sm">
          Браузер не дозволив зберегти кошик. Він працює в цій вкладці, але може
          не зберегтися після закриття.
        </p>
      )}
      {!items.length ? (
        <section className="border border-line bg-canvas px-6 py-20 text-center">
          <p className="mb-5 text-xs tracking-widest text-muted">
            МІСЦЕ ДЛЯ ВАШОГО ДЕНІМУ
          </p>
          <h2 className="text-3xl font-medium tracking-tight">
            Ваш кошик поки порожній
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted">
            Знайдіть свій крій, оберіть розмір і додайте улюблені речі.
          </p>
          <Link
            href="/catalog"
            className="mt-8 inline-flex min-h-12 items-center bg-ink px-6 text-sm text-paper"
          >
            Перейти до каталогу ↗
          </Link>
        </section>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-4">
            <button
              className={control}
              onClick={() => setRevision((v) => v + 1)}
            >
              Оновити ціни та залишки
            </button>
            <button className="min-h-11 text-xs underline" onClick={clearCart}>
              Очистити кошик
            </button>
          </div>
          {pending ? (
            <p role="status" className="border border-line p-10 text-sm">
              Звіряємо ціни та наявність…
            </p>
          ) : state?.error ? (
            <section role="alert" className="border border-danger p-7">
              <p className="text-sm leading-7">
                Не вдалося перевірити кошик. Ваш вибір збережено, але ціни й
                наявність поки не підтверджені.
              </p>
              <button
                className={control + " mt-4"}
                onClick={() => setRevision((v) => v + 1)}
              >
                Спробувати ще раз
              </button>
            </section>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="divide-y divide-line border-y border-line">
                {rows.map((row) => (
                  <article
                    key={row.variantId}
                    data-cart-variant={row.variantId}
                    className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-6"
                  >
                    <div className="relative aspect-[3/4] self-start overflow-hidden bg-canvas">
                      {row.imageId ? (
                        <Image
                          unoptimized
                          src={`/media/${row.imageId}`}
                          alt={row.name ?? ""}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center p-2 text-center text-[10px] text-muted">
                          Фото недоступне
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      {row.slug ? (
                        <Link
                          href={`/product/${row.slug}`}
                          className="text-base font-medium wrap-anywhere sm:text-xl"
                        >
                          {row.name}
                        </Link>
                      ) : (
                        <h2 className="text-base font-medium">
                          Товар недоступний
                        </h2>
                      )}
                      {row.size && (
                        <p className="mt-2 text-xs leading-6 text-muted">
                          Розмір: {row.size} · Колір: {row.color}
                        </p>
                      )}
                      {row.price !== undefined && (
                        <p className="mt-3 text-sm">
                          {formatPrice(row.price)}{" "}
                          <span className="text-xs text-muted">/ шт.</span>
                        </p>
                      )}
                      {row.status === "shortage" && (
                        <div
                          role="alert"
                          className="mt-4 border-l-2 border-denim bg-denim-wash p-3 text-xs leading-6"
                        >
                          Залишилося {row.stock} шт. Зменште кількість.
                          <button
                            className="block min-h-11 font-semibold underline"
                            onClick={() =>
                              setCartQuantity(
                                row.variantId,
                                Math.min(row.stock!, MAX_QUANTITY),
                              )
                            }
                          >
                            Скоригувати до {Math.min(row.stock!, MAX_QUANTITY)}{" "}
                            шт.
                          </button>
                        </div>
                      )}
                      {row.status === "unavailable" && (
                        <p
                          role="alert"
                          className="mt-4 text-xs leading-6 text-danger"
                        >
                          Товар або обраний варіант недоступний. Видаліть цю
                          позицію або оберіть інший розмір у каталозі.
                        </p>
                      )}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center">
                          <button
                            className={control}
                            disabled={
                              row.quantity <= 1 || row.status === "unavailable"
                            }
                            aria-label={`Зменшити кількість, розмір ${row.size ?? "недоступний"}`}
                            onClick={() =>
                              setCartQuantity(row.variantId, row.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <span
                            aria-label={`Кількість, розмір ${row.size ?? "недоступний"}`}
                            className="min-w-10 px-2 text-center text-sm tabular-nums"
                          >
                            {row.quantity}
                          </span>
                          <button
                            className={control}
                            disabled={
                              row.status !== "available" ||
                              row.quantity >=
                                Math.min(row.stock ?? 0, MAX_QUANTITY)
                            }
                            aria-label={`Збільшити кількість, розмір ${row.size ?? "недоступний"}`}
                            onClick={() =>
                              setCartQuantity(row.variantId, row.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                        {row.status !== "unavailable" &&
                          row.price !== undefined && (
                            <p className="text-base font-semibold tabular-nums">
                              {formatPrice(row.price * row.quantity)}
                            </p>
                          )}
                      </div>
                      <button
                        className="mt-3 min-h-11 text-xs text-muted underline"
                        aria-label={`Видалити, розмір ${row.size ?? "недоступний"}`}
                        onClick={() => removeCartItem(row.variantId)}
                      >
                        Видалити
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="border border-line bg-canvas p-6 sm:p-8">
                <h2 className="text-xl font-medium">Підсумок кошика</h2>
                <div className="mt-7 flex justify-between gap-3 border-b border-line pb-5 text-sm">
                  <span>Речей у кошику</span>
                  <span>{count}</span>
                </div>
                <div className="my-6 flex flex-wrap items-center justify-between gap-3 text-xl font-medium">
                  <span>Разом</span>
                  <span data-cart-total>{formatPrice(cartTotal(rows))}</span>
                </div>
                {blocked && (
                  <p
                    role="alert"
                    className="mb-5 text-xs leading-6 text-danger"
                  >
                    Перевірте недоступні позиції та залишки. Недоступні товари
                    не включено до суми.
                  </p>
                )}
                <button
                  disabled
                  className="min-h-12 w-full border border-line bg-paper px-3 text-sm text-muted"
                >
                  Оформлення ще недоступне
                </button>
                <p className="mt-4 text-xs leading-6 text-muted">
                  Ціни звірено з каталогом. Кошик не резервує товари на складі.
                  Доставка та оформлення з’являться пізніше.
                </p>
              </aside>
            </div>
          )}
        </>
      )}
    </main>
  );
}
