import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { uuidPattern } from "@/lib/categories/validation";
import { BannerEditor } from "@/components/admin/content/banner-editor";
import { getCategories } from "@/lib/catalog/data";
export default async function Banner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireAdmin(),
    id = (await params).id;
  if (!uuidPattern.test(id)) notFound();
  const [result, categories, products] = await Promise.all([
    client.from("homepage_banners").select("*").eq("id", id).maybeSingle(),
    getCategories(),
    client
      .from("products")
      .select("name,slug")
      .eq("status", "published")
      .order("name")
      .limit(1000),
  ]);
  if (result.error || products.error)
    throw Error("Не вдалося завантажити банер.");
  if (!result.data) notFound();
  const targets = [
    { path: "/", name: "Головна" },
    { path: "/catalog", name: "Весь каталог" },
    ...categories.map((c) => ({
      path: "/catalog/" + c.slug,
      name: "Категорія · " + c.name,
    })),
    ...(products.data ?? []).map((p) => ({
      path: "/product/" + p.slug,
      name: "Товар · " + p.name,
    })),
    ...["contacts", "delivery", "returns", "privacy", "terms"].map((p) => ({
      path: "/" + p,
      name: "Сторінка /" + p,
    })),
  ];
  return <BannerEditor initial={result.data} targets={targets} />;
}
