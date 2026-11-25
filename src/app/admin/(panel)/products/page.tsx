import Link from "next/link";
import Image from "next/image";
import { adminProducts } from "@/lib/admin/products/data";
import { getAdminCategories } from "@/lib/categories/admin";
import { categoryRows } from "@/lib/categories/validation";
import { formatPrice } from "@/lib/format-price";
import { ArchiveProduct } from "@/components/admin/products/archive";
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [result, categories] = await Promise.all([
    adminProducts(await searchParams),
    getAdminCategories(),
  ]);
  const { items, total, filters } = result;
  const pages = Math.ceil(total / 20);
  const pageUrl = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filters))
      if (k !== "page" && v) p.set(k, String(v));
    p.set("page", String(page));
    return "/admin/products?" + p.toString();
  };
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-[10px] tracking-[0.18em] text-denim">
            АСОРТИМЕНТ І СКЛАД
          </p>
          <h1 className="text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
            Товари
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
            Колекції, ціни та залишки. Зміни з’являються в магазині після
            збереження.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-12 items-center bg-ink px-5 text-sm font-semibold text-paper"
        >
          Додати товар ↗
        </Link>
      </div>
      <form
        action="/admin/products"
        className="mb-8 grid gap-4 border border-line bg-paper p-5 sm:grid-cols-2 xl:grid-cols-5"
      >
        {[{ name: "q", label: "Назва або артикул", type: "search" }].map(
          (f) => (
            <label key={f.name} className="min-w-0 text-xs">
              {f.label}
              <input
                name={f.name}
                type={f.type}
                defaultValue={filters.q}
                maxLength={120}
                className="mt-2 min-h-12 w-full min-w-0 border border-control px-3 text-base"
              />
            </label>
          ),
        )}
        <label className="min-w-0 text-xs">
          Категорія
          <select
            name="category"
            defaultValue={filters.category}
            className="mt-2 min-h-12 w-full min-w-0 border border-control px-3 text-sm"
          >
            <option value="">Усі категорії</option>
            {categoryRows(categories).map((r) => (
              <option value={r.category.id} key={r.category.id}>
                {r.path}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-xs">
          Статус
          <select
            name="status"
            defaultValue={filters.status}
            className="mt-2 min-h-12 w-full border border-control px-3 text-sm"
          >
            <option value="">Усі статуси</option>
            <option value="draft">Чернетка</option>
            <option value="published">Опубліковано</option>
            <option value="archived">Архів</option>
          </select>
        </label>
        <label className="min-w-0 text-xs">
          Сортування
          <select
            name="sort"
            defaultValue={filters.sort}
            className="mt-2 min-h-12 w-full border border-control px-3 text-sm"
          >
            <option value="newest">Спочатку нові</option>
            <option value="oldest">Спочатку давні</option>
            <option value="price_asc">Ціна: за зростанням</option>
            <option value="price_desc">Ціна: за спаданням</option>
            <option value="name">За назвою</option>
            <option value="stock">За залишком</option>
          </select>
        </label>
        <button className="min-h-12 self-end bg-ink px-5 text-sm text-paper">
          Застосувати
        </button>
        <Link
          href="/admin/products"
          className="inline-flex min-h-11 items-center text-xs underline"
        >
          Скинути фільтри
        </Link>
      </form>
      <p className="mb-4 text-xs text-muted">Знайдено товарів: {total}</p>
      <div className="space-y-3">
        {items.map((p) => (
          <article
            key={p.id}
            data-product-id={p.id}
            className="grid min-w-0 gap-4 border border-line bg-paper p-4 sm:grid-cols-[72px_minmax(0,1fr)] sm:p-6 xl:grid-cols-[72px_minmax(0,1fr)_160px_140px]"
          >
            <div className="relative aspect-[3/4] w-16 overflow-hidden bg-canvas sm:w-full">
              {p.cover_id ? (
                <Image
                  unoptimized
                  src={`/admin/product-media/${p.cover_id}?v=${encodeURIComponent(p.updated_at)}`}
                  alt={p.name}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center p-2 text-center text-[10px] text-muted">
                  Без фото
                </span>
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/products/${p.id}`}
                className="text-base font-semibold wrap-anywhere"
              >
                {p.name}
              </Link>
              <p className="mt-2 text-xs text-muted wrap-anywhere">{p.sku}</p>
              <p className="mt-2 text-xs leading-6 text-muted wrap-anywhere">
                {p.category_names.join(" / ") || "Категорію не обрано"}
              </p>
              <p className="mt-2 text-[10px] text-muted">
                Створено:{" "}
                {new Intl.DateTimeFormat("uk-UA", {
                  timeZone: "Europe/Kyiv",
                }).format(new Date(p.created_at))}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs sm:col-start-2 xl:col-start-auto xl:block">
              <p className="text-base font-medium">
                {formatPrice(p.price_kopecks)}
              </p>
              <p className="mt-1">Залишок: {p.stock} шт.</p>
              <p className="mt-1 text-muted">
                {p.status === "published"
                  ? "Опубліковано"
                  : p.status === "archived"
                    ? "Архів"
                    : "Чернетка"}
              </p>
            </div>
            <div className="min-w-0 sm:col-start-2 xl:col-start-auto">
              <Link
                href={`/admin/products/${p.id}`}
                className="inline-flex min-h-11 items-center border border-control px-3 text-xs"
              >
                Редагувати ↗
              </Link>
              {p.status !== "archived" && (
                <ArchiveProduct id={p.id} version={p.updated_at} compact />
              )}
            </div>
          </article>
        ))}
        {!items.length && (
          <section className="border border-line bg-paper p-8">
            <h2 className="text-xl">Товарів за цими умовами немає</h2>
            <p className="mt-3 text-sm text-muted">
              Змініть фільтри або додайте новий товар.
            </p>
          </section>
        )}
      </div>
      {pages > 1 && (
        <nav
          aria-label="Сторінки товарів"
          className="mt-8 flex flex-wrap items-center gap-4 text-xs"
        >
          {filters.page > 1 && (
            <Link
              className="min-h-11 border border-line px-4 py-3"
              href={pageUrl(filters.page - 1)}
            >
              ← Назад
            </Link>
          )}
          <span>
            Сторінка {filters.page} із {pages}
          </span>
          {filters.page < pages && (
            <Link
              className="min-h-11 border border-line px-4 py-3"
              href={pageUrl(filters.page + 1)}
            >
              Далі →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
