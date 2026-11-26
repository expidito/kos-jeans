import { CatalogPage } from "@/components/catalog/catalog-page";
import type { SearchValues } from "@/lib/catalog/params";
import { Suspense } from "react";
import Loading from "@/components/catalog/loading";
export const dynamic = "force-dynamic";
import { pageMetadata } from "@/lib/seo/metadata";
export async function generateMetadata() {
  return pageMetadata(
    "Каталог",
    "Опубліковані колекції, категорії та товари KOS JEANS. Оберіть свій денім.",
    "/catalog",
  );
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <CatalogPage search={await searchParams} />
    </Suspense>
  );
}
