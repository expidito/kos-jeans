import "server-only";
import type { Metadata } from "next";
import { getPublicContent } from "@/lib/content/data";
import { canonicalUrl, indexingEnabled } from "./policy";
export async function pageMetadata(
  title: string,
  description: string,
  path: string,
  image = "/images/storefront/hero.jpg",
): Promise<Metadata> {
  const c = await getPublicContent(),
    brand = String(c.brand.name);
  const full = `${title} | ${brand}`;
  return {
    title: { absolute: full },
    description: description.slice(0, 160),
    alternates: { canonical: canonicalUrl(path) },
    robots: { index: indexingEnabled(), follow: indexingEnabled() },
    openGraph: {
      title: full,
      description: description.slice(0, 160),
      url: canonicalUrl(path),
      type: "website",
      locale: "uk_UA",
      siteName: brand,
      images: [{ url: canonicalUrl(image), alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: full,
      description: description.slice(0, 160),
      images: [canonicalUrl(image)],
    },
  };
}
