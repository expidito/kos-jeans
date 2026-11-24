import type { Metadata } from "next";
import { StorefrontHome } from "@/components/storefront/storefront-home";
import { demoCategories, demoCollectionProducts, demoMenuImages, demoNavigation, demoProducts } from "@/data/demo-storefront";
import photoCredits from "@/data/storefront-photo-credits.json";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_SITE_URL || "https://kos-jeans.vercel.app"),
  title: { absolute: "KOS JEANS — твій ритм, твій денім" },
  description: "Знайомство з KOS JEANS: денім та повсякденний одяг для неї та для нього. Демонстраційна версія майбутнього магазину.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "KOS JEANS — твій ритм, твій денім",
    description: "Демонстраційна версія майбутнього магазину. Покупки ще недоступні.",
    type: "website",
    locale: "uk_UA",
    images: [{ url: "/images/storefront/hero.jpg", alt: "Денім / KOS JEANS" }],
  },
};

export default function HomePage() {
  // Demo data is isolated here; later blocks replace this adapter with server catalog data.
  return <StorefrontHome navigation={demoNavigation} menuImages={demoMenuImages} products={demoProducts} categories={demoCategories} collectionProducts={demoCollectionProducts} photoCredits={photoCredits} />;
}
