import { notFound } from "next/navigation";
import { getProduct } from "@/lib/product/data";
import { ProductPage } from "@/components/product/product-page";
export const dynamic = "force-dynamic";
import { pageMetadata } from "@/lib/seo/metadata";
import { indexingEnabled, jsonLd, productSchema } from "@/lib/seo/policy";
const load = getProduct;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const data = await load((await params).slug);
  if (!data) notFound();
  return pageMetadata(
    data.product.name,
    data.product.description,
    "/product/" + data.product.slug,
    data.images[0] ? "/media/" + data.images[0].id : undefined,
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const data = await load(slug);
  if (!data) notFound();
  return (
    <>
      {indexingEnabled() && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              productSchema(
                data.product,
                data.images.map((i) => "/media/" + i.id),
              ),
            ),
          }}
        />
      )}
      <ProductPage slug={slug} />
    </>
  );
}
