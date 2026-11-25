import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
export default async function Banners() {
  const { client } = await requireAdmin();
  const { data, error } = await client
    .from("homepage_banners")
    .select(
      "id,title,subtitle,is_visible,archived_at,starts_at,ends_at,sort_order",
    )
    .order("sort_order")
    .order("id");
  if (error) throw Error("Не вдалося завантажити банери.");
  return (
    <>
      <div className="mb-8 flex flex-wrap justify-between gap-5">
        <div>
          <p className="mb-3 text-[10px] tracking-widest text-denim">
            ГОЛОВНА / КОНТЕНТ
          </p>
          <h1 className="text-4xl tracking-tight sm:text-5xl">Банери</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            Фото, тексти й колекції головної сторінки. Показ залежить від
            видимості та обраного періоду.
          </p>
        </div>
        <Link
          href="/admin/banners/new"
          className="inline-flex min-h-12 items-center self-start bg-ink px-5 text-sm text-paper"
        >
          Додати банер ↗
        </Link>
      </div>
      <div className="space-y-4">
        {data?.map((b) => (
          <article
            key={b.id}
            className="flex min-w-0 flex-wrap items-center justify-between gap-5 border border-line bg-paper p-6"
          >
            <div className="min-w-0">
              <h2 className="text-lg font-medium wrap-anywhere">{b.title}</h2>
              <p className="mt-2 text-xs leading-6 text-muted">
                {b.archived_at
                  ? "Архів"
                  : b.is_visible
                    ? "Показ увімкнено"
                    : "Приховано"}{" "}
                · Порядок {b.sort_order}
              </p>
              <p className="mt-1 text-xs leading-6 text-muted">
                {b.starts_at
                  ? "Від " +
                    new Date(b.starts_at).toLocaleString("uk-UA", {
                      timeZone: "Europe/Kyiv",
                    })
                  : "Без дати початку"}{" "}
                /{" "}
                {b.ends_at
                  ? "до " +
                    new Date(b.ends_at).toLocaleString("uk-UA", {
                      timeZone: "Europe/Kyiv",
                    })
                  : "без дати завершення"}
              </p>
            </div>
            <Link
              href={"/admin/banners/" + b.id}
              className="inline-flex min-h-11 items-center border border-control px-4 text-xs"
            >
              {b.archived_at ? "Переглянути" : "Редагувати"} ↗
            </Link>
          </article>
        ))}
        {!data?.length && (
          <p className="border border-line bg-paper p-8 text-sm leading-7">
            Банерів ще немає. До їх публікації головна показує нейтральний банер
            KOS JEANS.
          </p>
        )}
      </div>
    </>
  );
}
