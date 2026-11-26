"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, verifyCart, consumePurchased } from "@/lib/cart/store";
import { cartTotal, type CartRow } from "@/lib/cart/model";
import {
  validKey,
  checkoutInput,
  type Customer,
  type Receipt,
} from "@/lib/checkout/validation";
import { formatPrice } from "@/lib/format-price";
const PENDING = "kos-checkout-pending-v1",
  DRAFT = "kos-checkout-draft-v1";
const blank: Customer = {
  name: "",
  phone: "",
  city: "",
  method: "nova_poshta_branch",
  address: "",
  comment: "",
};
const field =
  "mt-2 min-h-12 w-full min-w-0 border border-control bg-paper px-3 py-3 text-base";
export function CheckoutForm({ configured }: { configured: boolean }) {
  const router = useRouter(),
    { items, storageError } = useCart(),
    itemsKey = JSON.stringify(items);
  const [key, setKey] = useState(""),
    [customer, setCustomer] = useState<Customer>(blank),
    [ready, setReady] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const inFlight = useRef(false);
  const [quote, setQuote] = useState<{ key: string; rows: CartRow[] } | null>(
    null,
  );
  const [quoteError, setQuoteError] = useState(false);
  const finish = useCallback(
    (key: string, receipt: Receipt) => {
      consumePurchased(key, receipt.items);
      try {
        localStorage.removeItem(PENDING);
        sessionStorage.removeItem(DRAFT);
      } catch {
        /* Already persisted with the cart's completion marker. */
      }
      router.replace("/checkout/success");
    },
    [router],
  );
  const status = useCallback(async (key: string) => {
    const r = await fetch("/api/checkout/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Не вдалося перевірити стан.");
    return data.receipt as Receipt | null;
  }, []);
  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    fetch("/api/checkout/session", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error("Тестове оформлення тимчасово недоступне.");
        if (controller.signal.aborted) return;
        let pending = localStorage.getItem(PENDING);
        if (!validKey(pending)) {
          pending = crypto.randomUUID();
          localStorage.setItem(PENDING, pending);
        }
        setKey(pending);
        try {
          const saved = JSON.parse(sessionStorage.getItem(DRAFT) ?? "null");
          if (saved?.key === pending && saved.customer) {
            const next = { ...blank };
            for (const k of Object.keys(next) as (keyof Customer)[])
              if (
                typeof saved.customer[k] === "string" &&
                saved.customer[k].length <= 1000
              )
                Object.assign(next, { [k]: saved.customer[k] });
            setCustomer(next);
          }
        } catch {
          /* Ignore malformed local drafts. */
        }
        const receipt = await status(pending);
        if (controller.signal.aborted) return;
        if (receipt) {
          finish(pending, receipt);
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Не вдалося підготувати безпечне оформлення. Дозвольте збереження даних у браузері та повторіть спробу.",
          );
      });
    return () => controller.abort();
  }, [configured, finish, status, revision]);
  useEffect(() => {
    const controller = new AbortController();
    verifyCart(JSON.parse(itemsKey), controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setQuote({ key: itemsKey, rows });
          setQuoteError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setQuoteError(true);
      });
    return () => controller.abort();
  }, [itemsKey, revision]);
  const change = (field: keyof Customer, value: string) => {
    const next = { ...customer, [field]: value };
    setCustomer(next);
    setConfirmed(false);
    try {
      sessionStorage.setItem(DRAFT, JSON.stringify({ key, customer: next }));
    } catch {
      /* Form remains usable in this tab. */
    }
  };
  const rows = quote?.key === itemsKey ? quote.rows : [],
    valid =
      rows.length === items.length &&
      rows.length > 0 &&
      rows.every((r) => r.status === "available");
  if (!configured)
    return (
      <section className="border border-line bg-canvas p-8">
        <h2 className="text-2xl font-medium">
          Тестове оформлення ще не налаштоване
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted">
          Потрібне серверне підключення до тестової бази. Ваш кошик залишається
          збереженим.
        </p>
        <Link
          href="/cart"
          className="mt-6 inline-flex min-h-11 items-center underline"
        >
          До кошика
        </Link>
      </section>
    );
  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-6 border-l-2 border-danger bg-canvas p-5 text-sm leading-7"
        >
          {error}
          <div className="mt-3 flex flex-wrap gap-4">
            <button
              type="button"
              className="min-h-11 underline"
              disabled={busy}
              onClick={() => setRevision((n) => n + 1)}
            >
              Повторити перевірку
            </button>
            {key && (
              <button
                type="button"
                className="min-h-11 underline"
                disabled={busy}
                onClick={async () => {
                  try {
                    const receipt = await status(key);
                    if (receipt) finish(key, receipt);
                    else
                      setError(
                        "Замовлення поки не знайдено. Можна повторити підтвердження з тим самим номером запиту.",
                      );
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Спробуйте ще раз.",
                    );
                  }
                }}
              >
                Перевірити стан запиту
              </button>
            )}
          </div>
        </div>
      )}
      {!ready ? (
        <p role="status" className="border border-line p-8">
          Готуємо безпечне оформлення…
        </p>
      ) : !items.length ? (
        <section className="border border-line bg-canvas p-8">
          <h2 className="text-2xl">Кошик порожній</h2>
          <Link
            href="/catalog"
            className="mt-5 inline-flex min-h-12 items-center bg-ink px-5 text-paper"
          >
            Перейти до каталогу
          </Link>
        </section>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (inFlight.current || !valid || !confirmed || !ready) return;
            inFlight.current = true;
            setBusy(true);
            setError("");
            try {
              const payload = checkoutInput({
                key,
                customer,
                items: rows.map((r) => ({
                  variantId: r.variantId,
                  quantity: r.quantity,
                  price: r.price,
                })),
              });
              const response = await fetch("/api/checkout/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                cache: "no-store",
                signal: AbortSignal.timeout(25000),
              });
              const data = await response.json();
              if (response.ok && data.receipt) {
                finish(key, data.receipt);
                return;
              }
              if (Array.isArray(data.rows)) {
                setQuote({ key: itemsKey, rows: data.rows });
                setConfirmed(false);
              }
              throw Error(
                data.error ||
                  "Не вдалося підтвердити замовлення. Перевірте стан перед повторною спробою.",
              );
            } catch (e) {
              setError(
                e instanceof Error &&
                  e.name !== "TimeoutError" &&
                  e.name !== "TypeError"
                  ? e.message
                  : "З’єднання перервано. Перевірте стан або повторіть підтвердження; запит буде тим самим.",
              );
            } finally {
              inFlight.current = false;
              setBusy(false);
            }
          }}
          aria-busy={busy}
        >
          <fieldset
            disabled={busy}
            className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
          >
            <div className="space-y-7">
              <section className="grid gap-5 border border-line bg-paper p-5 sm:grid-cols-2 sm:p-8">
                <h2 className="text-xl font-medium sm:col-span-2">
                  Контактні дані
                </h2>
                <label className="min-w-0 text-xs sm:col-span-2">
                  Ім’я та прізвище
                  <input
                    aria-label="Ім’я та прізвище"
                    autoComplete="name"
                    required
                    maxLength={100}
                    value={customer.name}
                    onChange={(e) => change("name", e.target.value)}
                    className={field}
                  />
                </label>
                <label className="min-w-0 text-xs sm:col-span-2">
                  Номер телефону
                  <input
                    aria-label="Номер телефону"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    maxLength={30}
                    placeholder="+380…"
                    value={customer.phone}
                    onChange={(e) => change("phone", e.target.value)}
                    className={field}
                  />
                </label>
                <p className="text-xs leading-6 text-muted sm:col-span-2">
                  Тестове оформлення: використовуйте вигадані контакти.
                  Онлайн-оплата не підключена.
                </p>
              </section>
              <section className="grid gap-5 border border-line bg-paper p-5 sm:grid-cols-2 sm:p-8">
                <h2 className="text-xl font-medium sm:col-span-2">Доставка</h2>
                <label className="min-w-0 text-xs sm:col-span-2">
                  Місто
                  <input
                    aria-label="Місто"
                    autoComplete="address-level2"
                    required
                    maxLength={100}
                    value={customer.city}
                    onChange={(e) => change("city", e.target.value)}
                    className={field}
                  />
                </label>
                <label className="min-w-0 text-xs sm:col-span-2">
                  Спосіб доставки
                  <select
                    aria-label="Спосіб доставки"
                    value={customer.method}
                    onChange={(e) => change("method", e.target.value)}
                    className={field}
                  >
                    <option value="nova_poshta_branch">
                      Нова пошта · відділення
                    </option>
                    <option value="nova_poshta_address">
                      Нова пошта · адреса
                    </option>
                  </select>
                </label>
                <label className="min-w-0 text-xs sm:col-span-2">
                  Відділення Нової пошти або адреса
                  <input
                    aria-label="Відділення Нової пошти або адреса"
                    autoComplete="off"
                    required
                    maxLength={300}
                    value={customer.address}
                    onChange={(e) => change("address", e.target.value)}
                    className={field}
                  />
                </label>
                <p className="text-xs leading-6 text-muted sm:col-span-2">
                  Місто та відділення вводяться вручну. Перевірки через API
                  Нової пошти немає. Умови, вартість і строки доставки та спосіб
                  оплати будуть визначені перед запуском.
                </p>
                <label className="min-w-0 text-xs sm:col-span-2">
                  Коментар до замовлення
                  <textarea
                    aria-label="Коментар до замовлення"
                    rows={3}
                    maxLength={1000}
                    value={customer.comment}
                    onChange={(e) => change("comment", e.target.value)}
                    className={field}
                  />
                </label>
              </section>
            </div>
            <aside className="min-w-0 border border-line bg-canvas p-5 sm:p-7">
              <h2 className="text-xl font-medium">Ваш вибір</h2>
              {quoteError ? (
                <p role="alert" className="mt-5 text-sm leading-7">
                  Не вдалося звірити кошик.{" "}
                  <button
                    type="button"
                    className="min-h-11 underline"
                    onClick={() => setRevision((n) => n + 1)}
                  >
                    Повторити перевірку
                  </button>
                </p>
              ) : quote?.key !== itemsKey ? (
                <p role="status" className="mt-5 text-sm">
                  Звіряємо ціни й залишки…
                </p>
              ) : (
                <>
                  <div className="mt-6 divide-y divide-line">
                    {rows.map((r) => (
                      <article
                        key={r.variantId}
                        className="grid min-w-0 grid-cols-[60px_minmax(0,1fr)] gap-3 py-4"
                      >
                        <div className="relative aspect-[3/4] bg-paper">
                          {r.imageId && (
                            <Image
                              unoptimized
                              fill
                              sizes="60px"
                              src={`/media/${r.imageId}?w=480`}
                              alt={r.name ?? ""}
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm leading-6 wrap-anywhere">
                            {r.name ?? "Товар недоступний"}
                          </p>
                          {r.size && (
                            <p className="mt-1 text-xs leading-6 text-muted">
                              {r.size} / {r.color} · {r.quantity} шт.
                            </p>
                          )}
                          {r.price !== undefined && (
                            <p className="mt-2 text-xs">
                              {formatPrice(r.price)} / шт. ·{" "}
                              {formatPrice(r.price * r.quantity)}
                            </p>
                          )}
                          {r.status !== "available" && (
                            <p
                              role="alert"
                              className="mt-2 text-xs text-danger"
                            >
                              Недостатньо залишку або товар недоступний.
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-6 text-xl font-medium">
                    <span>Разом за товари</span>
                    <span data-checkout-total>
                      {formatPrice(cartTotal(rows))}
                    </span>
                  </div>
                </>
              )}
              <p className="mt-4 text-xs leading-6 text-muted">
                Без онлайн-оплати. Доставка не включена до цієї суми; її умови
                ще погоджуються.
              </p>
              {(!valid || quoteError || storageError) && (
                <p role="alert" className="mt-4 text-xs leading-6 text-danger">
                  Поверніться до кошика й перевірте товари та збереження у
                  браузері.
                </p>
              )}
              <Link
                href="/cart"
                className="mt-4 inline-flex min-h-11 items-center text-xs underline"
              >
                Редагувати кошик
              </Link>
              <label className="mt-4 flex min-h-12 items-start gap-3 text-xs leading-6">
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 accent-ink"
                />
                Підтверджую товари, кількість, актуальні ціни та введені дані
                доставки.
              </label>
              <button
                type="submit"
                disabled={
                  !valid || !confirmed || busy || quoteError || storageError
                }
                className="mt-5 min-h-12 w-full bg-ink px-4 text-sm font-semibold text-paper disabled:bg-line disabled:text-muted"
              >
                {busy ? "Підтверджуємо…" : "Підтвердити замовлення"}
              </button>
              <p role="status" className="mt-3 text-xs leading-6 text-muted">
                {busy
                  ? "Не закривайте сторінку. Повторний запит не створить друге замовлення."
                  : "Наявність і ціни повторно перевіряються сервером перед збереженням."}
              </p>
            </aside>
          </fieldset>
        </form>
      )}
    </>
  );
}
