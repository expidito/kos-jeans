import Link from "next/link";
import { adminOrders } from "@/lib/admin/orders/data";
import {
  deliveryLabel,
  orderDate,
  orderStatuses,
} from "@/lib/admin/orders/policy";
import { OrderBadge } from "@/components/admin/orders/status";
import { formatPrice } from "@/lib/format-price";
const field =
  "mt-2 min-h-12 w-full min-w-0 border border-control bg-paper px-3 text-base";
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { items, total, filters } = await adminOrders(await searchParams);
  const pages = Math.ceil(total / 20);
  const pageUrl = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, page }))
      if (v) p.set(k, String(v));
    return "/admin/orders?" + p.toString();
  };
  return (
    <>
      <p className="mb-3 text-[10px] tracking-[0.18em] text-denim">
        ПРОДАЖІ / KOS JEANS
      </p>
      <h1 className="text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
        Замовлення
      </h1>
      <p className="mt-3 mb-8 max-w-xl text-sm leading-7 text-muted">
        Нові замовлення, склад і доставка. Дані доступні лише адміністраторам.
        Час — за Києвом.
      </p>
      <form
        action="/admin/orders"
        className="mb-8 grid gap-4 border border-line bg-paper p-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        <label className="min-w-0 text-xs">
          Номер замовлення
          <input
            name="number"
            type="search"
            inputMode="numeric"
            maxLength={18}
            defaultValue={filters.number}
            className={field}
          />
        </label>
        <label className="min-w-0 text-xs">
          Статус
          <select name="status" defaultValue={filters.status} className={field}>
            <option value="">Усі статуси</option>
            {Object.entries(orderStatuses).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-xs">
          Сортування
          <select name="sort" defaultValue={filters.sort} className={field}>
            <option value="newest">Спочатку нові</option>
            <option value="oldest">Спочатку давні</option>
            <option value="total_asc">Сума: за зростанням</option>
            <option value="total_desc">Сума: за спаданням</option>
          </select>
        </label>
        <label className="min-w-0 text-xs">
          Дата від
          <input
            name="from"
            type="date"
            defaultValue={filters.from}
            className={field}
          />
        </label>
        <label className="min-w-0 text-xs">
          Дата до
          <input
            name="to"
            type="date"
            min={filters.from || undefined}
            defaultValue={filters.to}
            className={field}
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <button className="min-h-12 bg-ink px-5 text-sm text-paper">
            Застосувати
          </button>
          <Link
            href="/admin/orders"
            className="inline-flex min-h-12 items-center text-xs underline"
          >
            Скинути
          </Link>
        </div>
      </form>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Знайдено замовлень: {total}</p>
        <Link
          href={pageUrl(filters.page)}
          prefetch={false}
          className="inline-flex min-h-11 items-center text-xs underline"
        >
          Оновити список
        </Link>
      </div>
      <div
        className="hidden grid-cols-[1.2fr_1.5fr_1fr_1.2fr_1fr] gap-4 px-5 pb-3 text-[10px] uppercase tracking-wider text-muted xl:grid"
        aria-hidden="true"
      >
        <span>Номер / дата</span>
        <span>Покупець / доставка</span>
        <span>Сума / товари</span>
        <span>Статус</span>
        <span>Деталі</span>
      </div>
      <div className="space-y-3">
        {items.map((o) => (
          <article
            key={o.id}
            className="grid min-w-0 gap-4 border border-line bg-paper p-5 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.5fr_1fr_1.2fr_1fr]"
          >
            <div>
              <Link
                href={`/admin/orders/${o.id}`}
                className="text-lg font-semibold"
              >
                №{o.order_number}
              </Link>
              <p className="mt-2 text-xs leading-6 text-muted">
                {orderDate(o.created_at)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium wrap-anywhere">
                {o.customer_name}
              </p>
              <p className="mt-2 text-xs leading-6 text-muted">
                {deliveryLabel(o.delivery_method)}
              </p>
            </div>
            <div>
              <p className="text-base font-medium">
                {formatPrice(o.total_kopecks)}
              </p>
              <p className="mt-2 text-xs text-muted">
                Товарів: {o.quantity} шт.
              </p>
            </div>
            <div>
              <OrderBadge status={o.status} />
            </div>
            <div>
              <Link
                href={`/admin/orders/${o.id}`}
                className="inline-flex min-h-11 items-center border border-control px-3 text-xs"
              >
                Переглянути ↗
              </Link>
            </div>
          </article>
        ))}
        {!items.length && (
          <section className="border border-line bg-paper p-8">
            <h2 className="text-xl">Замовлень за цими умовами немає</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Змініть фільтри або оновіть список після надходження нового
              замовлення.
            </p>
          </section>
        )}
      </div>
      {pages > 1 && (
        <nav
          aria-label="Сторінки замовлень"
          className="mt-8 flex flex-wrap items-center gap-4 text-xs"
        >
          {filters.page > 1 && (
            <Link
              href={pageUrl(filters.page - 1)}
              className="min-h-11 border border-line px-4 py-3"
            >
              ← Назад
            </Link>
          )}
          <span>
            Сторінка {filters.page} із {pages}
          </span>
          {filters.page < pages && (
            <Link
              href={pageUrl(filters.page + 1)}
              className="min-h-11 border border-line px-4 py-3"
            >
              Далі →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
