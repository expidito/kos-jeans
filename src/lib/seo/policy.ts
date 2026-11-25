// Deliberately locked until explicit owner approval after blocks 15–16.
// No environment variable can accidentally expose Preview/dev inventory to search.
export function indexingEnabled() {
  return false;
}
export function canonicalOrigin(value = process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    const u = new URL(value || "https://kos-jeans.vercel.app");
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.pathname !== "/" ||
      u.search ||
      u.hash ||
      u.hostname.includes("git-")
    )
      throw Error();
    return u.origin;
  } catch {
    return "https://kos-jeans.vercel.app";
  }
}
export function canonicalUrl(path: string) {
  return canonicalOrigin() + path;
}
export function jsonLd(value: unknown) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}
export function productSchema(
  p: { name: string; sku: string; slug: string; description: string },
  images: string[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: p.description,
    url: canonicalUrl("/product/" + p.slug),
    ...(images.length ? { image: images.map(canonicalUrl) } : {}),
  };
}
