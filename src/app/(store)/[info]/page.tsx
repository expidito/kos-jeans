import { notFound } from "next/navigation";
import { CatalogShell } from "@/components/catalog/catalog-shell";
import { getCategories, categoryTree } from "@/lib/catalog/data";
import { getPublicContent } from "@/lib/content/data";
import { contentLabels, type ContentKey } from "@/lib/content/policy";
import { pageMetadata } from "@/lib/seo/metadata";
const pages: Record<
  string,
  { title: string; keys: ContentKey[]; description: string }
> = {
  contacts: {
    title: "Контакти",
    keys: ["contacts", "social_links"],
    description:
      "Контактна інформація KOS JEANS та офіційні соціальні сторінки магазину.",
  },
  delivery: {
    title: "Доставка та оплата",
    keys: ["delivery_template", "payment_template"],
    description:
      "Відомості про доставку та оплату в KOS JEANS. Підтверджені умови та стан їх підготовки.",
  },
  returns: {
    title: "Обмін та повернення",
    keys: ["returns_template"],
    description:
      "Інформація KOS JEANS щодо обміну, повернення та звернень покупців.",
  },
  privacy: {
    title: "Політика конфіденційності",
    keys: ["privacy_template"],
    description:
      "Відомості про обробку персональних даних у KOS JEANS. Статус погодження політики.",
  },
  terms: {
    title: "Умови користування",
    keys: ["terms_template"],
    description:
      "Умови користування сайтом KOS JEANS та стан підготовки документів магазину.",
  },
};
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  const slug = (await params).info,
    p = pages[slug];
  if (!p) return {};
  return pageMetadata(p.title, p.description, "/" + slug);
}
export default async function Information({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  const p = pages[(await params).info];
  if (!p) notFound();
  const [c, categories] = await Promise.all([
    getPublicContent(),
    getCategories(),
  ]);
  return (
    <CatalogShell navigation={categoryTree(categories)}>
      <main
        id="main-content"
        className="mx-auto max-w-store px-page py-10 sm:py-16"
      >
        <p className="mb-4 text-[10px] tracking-[0.18em] text-denim">
          ІНФОРМАЦІЯ / {String(c.brand.name)}
        </p>
        <h1 className="max-w-3xl text-heading font-medium wrap-anywhere">
          {p.title}
        </h1>
        <div className="mt-8 max-w-3xl border-l-2 border-denim bg-denim-wash p-5 text-sm leading-7">
          Магазин у розробці. Незаповнені відомості та чернетки потребують
          погодження власника перед публічним запуском.
        </div>
        <div className="mt-10 max-w-3xl space-y-8">
          {p.keys.map((k) => {
            const v = c[k];
            return (
              <section
                key={k}
                className="border border-line bg-paper p-6 sm:p-9"
              >
                <h2 className="text-xl font-medium">{contentLabels[k]}</h2>
                {k === "contacts" ? (
                  <div className="mt-5 space-y-3 text-sm leading-7">
                    {v.verified && (v.phone || v.email) ? (
                      <>
                        {v.phone && (
                          <p>
                            <a
                              className="underline wrap-anywhere"
                              href={`tel:${v.phone}`}
                            >
                              {String(v.phone)}
                            </a>
                          </p>
                        )}
                        {v.email && (
                          <p>
                            <a
                              className="underline wrap-anywhere"
                              href={`mailto:${v.email}`}
                            >
                              {String(v.email)}
                            </a>
                          </p>
                        )}
                      </>
                    ) : (
                      <p>
                        Підтверджені телефон та email ще не опубліковані. Адреса
                        й реквізити продавця потребують заповнення перед
                        запуском.
                      </p>
                    )}
                  </div>
                ) : k === "social_links" ? (
                  <div className="mt-5 text-sm leading-7">
                    {v.verified &&
                    ["instagram", "facebook", "tiktok", "other"].some(
                      (f) => v[f],
                    ) ? (
                      ["instagram", "facebook", "tiktok", "other"].map(
                        (f) =>
                          v[f] && (
                            <a
                              key={f}
                              href={String(v[f])}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex min-h-11 items-center underline"
                            >
                              {f === "other" ? "Інша офіційна сторінка" : f} ↗
                            </a>
                          ),
                      )
                    ) : (
                      <p>Офіційні сторінки ще не підтверджені.</p>
                    )}
                  </div>
                ) : (
                  <>
                    {v.draft && (
                      <p className="mt-4 inline-block bg-canvas px-3 py-2 text-[10px] tracking-wider">
                        ЧЕРНЕТКА · НЕ ПОГОДЖЕНО
                      </p>
                    )}
                    <p className="mt-5 whitespace-pre-line text-sm leading-8 wrap-anywhere">
                      {String(v.text) ||
                        "Інформація потребує заповнення власником."}
                    </p>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </CatalogShell>
  );
}
