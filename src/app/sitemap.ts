import type { MetadataRoute } from "next";
import { canonicalUrl, indexingEnabled } from "@/lib/seo/policy";
import { publicCatalogClient, getCategories } from "@/lib/catalog/data";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingEnabled()) return [];
  const client = publicCatalogClient();
  if (!client) return [];
  const [{ data, error }, categories] = await Promise.all([
    client.from("products").select("slug,updated_at"),
    getCategories(),
  ]);
  if (error) return [];
  return [
    ...[
      "/",
      "/catalog",
      "/contacts",
      "/delivery",
      "/returns",
      "/privacy",
      "/terms",
    ].map((p) => ({ url: canonicalUrl(p) })),
    ...categories.map((c) => ({
      url: canonicalUrl("/catalog/" + c.slug),
      lastModified: c.updated_at,
    })),
    ...(data ?? []).map((p) => ({
      url: canonicalUrl("/product/" + p.slug),
      lastModified: p.updated_at,
    })),
  ];
}
