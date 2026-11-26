import type { MetadataRoute } from "next";
import { canonicalUrl, indexingEnabled } from "@/lib/seo/policy";
export default function robots(): MetadataRoute.Robots {
  return indexingEnabled()
    ? {
        rules: [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/cart", "/checkout", "/api"],
          },
        ],
        sitemap: canonicalUrl("/sitemap.xml"),
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
