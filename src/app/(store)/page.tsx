import {
  getCategories,
  categoryTree,
  publicCatalogClient,
} from "@/lib/catalog/data";
import { HomeCollection } from "@/components/catalog/home-collection";
export const dynamic = "force-dynamic";
import { StorefrontHome } from "@/components/storefront/storefront-home";
import {
  demoCategories,
  demoCollectionProducts,
  demoMenuImages,
  demoNavigation,
  demoProducts,
} from "@/data/demo-storefront";
import photoCredits from "@/data/storefront-photo-credits.json";

import { getPublicContent, publicBanners } from "@/lib/content/data";
import { HomeBanners } from "@/components/content/home-banners";
import { ContentFooter } from "@/components/content/footer";
import { pageMetadata } from "@/lib/seo/metadata";
export async function generateMetadata() {
  const c = await getPublicContent();
  return pageMetadata("Денім та повсякденний одяг", String(c.about.text), "/");
}

export default async function HomePage() {
  const [content, banners] = await Promise.all([
    getPublicContent(),
    publicBanners(),
  ]);
  const contentProps = {
    heroContent: <HomeBanners banners={banners} />,
    hasBanners: banners.length > 0,
    footer: <ContentFooter content={content} />,
    aboutText: String(content.about.text),
  };
  // Production never falls back to illustrative products/prices while its database is disconnected.
  if (publicCatalogClient() || process.env.VERCEL_ENV === "production")
    return (
      <StorefrontHome
        {...contentProps}
        liveCatalog
        catalogContent={<HomeCollection />}
        navigation={categoryTree(await getCategories())}
        menuImages={{}}
        products={[]}
        categories={[]}
        collectionProducts={{}}
        photoCredits={photoCredits}
      />
    );
  // Demo adapter is available only for unconfigured local/Preview design review.
  return (
    <StorefrontHome
      {...contentProps}
      navigation={demoNavigation}
      menuImages={demoMenuImages}
      products={demoProducts}
      categories={demoCategories}
      collectionProducts={demoCollectionProducts}
      photoCredits={photoCredits}
    />
  );
}
