import Link from "next/link";
import { notFound } from "next/navigation";
import { adminOrder } from "@/lib/admin/orders/data";
import {
  deliveryLabel,
  orderDate,
  orderStatus,
} from "@/lib/admin/orders/policy";
import { OrderBadge } from "@/components/admin/orders/status";
import { OrderStatusControl } from "@/components/admin/orders/status-control";
import { formatPrice } from "@/lib/format-price";
export default async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const data = await adminOrder((await params).id);
  if (!data) notFound();
  const { order: o, items } = data;
  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-6 inline-flex min-h-11 items-center text-xs underline"
      >
        ← Усі замовлення
      </Link>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-3 text-[10px] tracking-[0.18em] text-denim">
            ПРОДАЖІ / ДЕТАЛІ
          </p>
          <h1 className="text-4xl tracking-[-0.05em] sm:text-5xl">
            Замовлення №{o.order_number}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {orderDate(o.created_at)} · Київ
          </p>
        </div>
        <OrderBadge status={o.status} />
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className="border border-line bg-paper p-5 sm:p-7">
            <h2 className="text-xl font-medium">Покупець і доставка</h2>
            <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
              {[
                ["Ім’я та прізвище", o.customer_name],
                ["Телефон", o.customer_phone],
                ["Місто", o.city],
                ["Спосіб доставки", deliveryLabel(o.delivery_method)],
                ["Відділення або адреса", o.delivery_address],
                ["Коментар", o.comment || "Без коментаря"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="mb-2 text-xs text-muted">{label}</dt>
                  <dd className="whitespace-pre-wrap leading-6 wrap-anywhere">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="border border-line bg-paper p-5 sm:p-7">
            <h2 className="text-xl font-medium">Товари в замовленні</h2>
            <p className="mt-3 text-xs leading-6 text-muted">
              Назви, варіанти й ціни збережено на момент оформлення. Зміни
              каталогу не змінюють це замовлення.
            </p>
            <div className="mt-6 divide-y divide-line">
              {items.map((i) => (
                <article
                  key={i.id}
                  className="grid min-w-0 gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_140px]"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold wrap-anywhere">
                      {i.product_name}
                    </h3>
                    <p className="mt-2 text-xs text-muted wrap-anywhere">
                      SKU: {i.sku}
                    </p>
                    <p className="mt-2 text-sm leading-6 wrap-anywhere">
                      Розмір {i.size} · {i.color} · {i.quantity} шт.
                    </p>
                    {!i.variant_id && (
                      <p className="mt-2 text-xs text-amber-900">
                        Варіант видалено з каталогу. Історію збережено.
                      </p>
                    )}
                  </div>
                  <div className="text-sm">
                    <p>{formatPrice(i.unit_price_kopecks)} / шт.</p>
                    <p className="mt-2 font-semibold">
                      {formatPrice(i.line_total_kopecks)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
              <span className="text-sm">Разом за товари</span>
              <strong className="text-2xl font-medium">
                {formatPrice(o.total_kopecks)}
              </strong>
            </div>
            <p className="mt-3 text-xs leading-6 text-muted">
              Без онлайн-оплати. Доставка не включена до суми товарів.
            </p>
          </section>
        </div>
        <aside className="min-w-0 space-y-5">
          {orderStatus(o.status) && (
            <OrderStatusControl
              id={o.id}
              status={o.status}
              version={o.updated_at}
            />
          )}{" "}
          {o.inventory_released_at && (
            <p className="border border-line p-5 text-xs leading-6 text-muted">
              Скасування оброблено {orderDate(o.inventory_released_at)}.
              Повторне скасування не повертає залишки знову. Видалені варіанти
              не відтворюються.
            </p>
          )}
          <p className="text-xs leading-6 text-muted">
            Тестове середовище kos-jeans-dev. Не відправляйте тестові замовлення
            покупцям.
          </p>
        </aside>
      </div>
    </>
  );
}
