import Link from "next/link";
import { type ContentKey, type ContentValue } from "@/lib/content/policy";
export const informationLinks = [
  ["/contacts", "Контакти"],
  ["/delivery", "Доставка та оплата"],
  ["/returns", "Обмін та повернення"],
  ["/privacy", "Політика конфіденційності"],
  ["/terms", "Умови користування"],
] as const;
export function ContentFooter({
  content,
}: {
  content: Record<ContentKey, ContentValue>;
}) {
  const c = content.contacts,
    s = content.social_links;
  return (
    <footer className="bg-ink px-page py-12 text-paper">
      <div className="mx-auto grid max-w-store gap-9 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link
            prefetch={false}
            href="/"
            className="text-2xl font-extrabold tracking-tight wrap-anywhere"
          >
            {String(content.brand.name)} /
          </Link>
          <p className="mt-5 text-xs leading-7 text-white/65">
            Денім та повсякденний одяг.
            <br />
            Магазин у розробці. Не для реальних покупок.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-[10px] tracking-widest uppercase text-white/60">
            Колекція
          </h2>
          <Link
            href="/catalog"
            prefetch={false}
            className="inline-flex min-h-11 items-center text-sm underline"
          >
            Всі товари ↗
          </Link>
          <br />
          <Link
            href="/#about"
            className="inline-flex min-h-11 items-center text-xs"
          >
            Про магазин
          </Link>
        </div>
        <nav aria-label="Інформація магазину">
          <h2 className="mb-4 text-[10px] tracking-widest uppercase text-white/60">
            Інформація
          </h2>
          {informationLinks.map(([href, title]) => (
            <Link
              prefetch={false}
              key={href}
              href={href}
              className="flex min-h-11 items-center text-xs hover:underline"
            >
              {title}
            </Link>
          ))}
        </nav>
        <div>
          <h2 className="mb-4 text-[10px] tracking-widest uppercase text-white/60">
            На зв’язку
          </h2>
          {c.verified && (c.phone || c.email) ? (
            <>
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  className="flex min-h-11 items-center text-xs wrap-anywhere"
                >
                  {String(c.phone)}
                </a>
              )}
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="flex min-h-11 items-center text-xs wrap-anywhere"
                >
                  {String(c.email)}
                </a>
              )}
            </>
          ) : (
            <p className="text-xs leading-7 text-white/65">
              Підтверджені контакти ще не опубліковані.
            </p>
          )}
          {s.verified &&
            ["instagram", "facebook", "tiktok", "other"].map(
              (k) =>
                s[k] && (
                  <a
                    key={k}
                    href={String(s[k])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center text-xs"
                  >
                    {k === "other"
                      ? "Інша сторінка"
                      : k[0].toUpperCase() + k.slice(1)}{" "}
                    ↗
                  </a>
                ),
            )}
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-store flex-wrap justify-between gap-3 border-t border-white/20 pt-6 text-[10px] text-white/60">
        <p>© {String(content.brand.name)}</p>
        <p>Українська / UAH ₴ · Тестове середовище</p>
      </div>
    </footer>
  );
}
