import Image from "next/image";
import Link from "next/link";
import { publicBanners } from "@/lib/content/data";
export function HomeBanners({
  banners,
}: {
  banners: Awaited<ReturnType<typeof publicBanners>>;
}) {
  if (!banners.length) return null;
  return (
    <div>
      {banners.map((b, i) => (
        <section key={b.id} className="bg-canvas" aria-label={b.title}>
          <div className="mx-auto grid max-w-store lg:grid-cols-[1.05fr_1fr]">
            <div className="flex flex-col items-start justify-center px-page py-12 sm:py-16 lg:min-h-[660px]">
              <p className="mb-8 text-[10px] tracking-[0.16em]">
                KOS JEANS / КОЛЕКЦІЯ
              </p>
              {i === 0 ? (
                <h1 className="text-display font-medium wrap-anywhere">
                  {b.title}
                </h1>
              ) : (
                <h2 className="text-heading font-medium wrap-anywhere">
                  {b.title}
                </h2>
              )}
              <p className="mt-6 max-w-md whitespace-pre-line text-sm leading-7 text-graphite wrap-anywhere">
                {b.subtitle}
              </p>
              {b.link_path && b.button_label && (
                <Link
                  prefetch={false}
                  href={b.link_path}
                  className="mt-8 inline-flex min-h-12 items-center gap-6 bg-ink px-6 text-sm font-semibold text-paper"
                >
                  {b.button_label} ↗
                </Link>
              )}
            </div>
            <div className="relative h-[440px] overflow-hidden sm:h-[560px] lg:h-auto lg:min-h-[660px]">
              <Image
                unoptimized
                src={`/banner-media/${b.id}?v=${encodeURIComponent(b.updated_at)}`}
                alt={b.alt_text || b.title}
                fill
                sizes="(max-width:1024px) 100vw,50vw"
                preload={i === 0}
                className="object-cover"
              />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
