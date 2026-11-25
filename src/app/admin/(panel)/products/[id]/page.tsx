import { notFound } from "next/navigation";
import { getAdminCategories } from "@/lib/categories/admin";
import { productEditor } from "@/lib/admin/products/data";
import { uuidPattern } from "@/lib/categories/validation";
import { ProductEditor } from "@/components/admin/products/editor";
export default async function EditProduct({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const categories = await getAdminCategories();
  if (!uuidPattern.test(id)) notFound();
  const initial = await productEditor(id);
  if (!initial) notFound();
  return (
    <>
      {(await searchParams).notice === "saved" && (
        <p
          role="status"
          className="mb-6 border-l-2 border-denim bg-denim-wash p-4 text-sm"
        >
          Товар збережено. Зміни вже доступні в магазині відповідно до статусу.
        </p>
      )}
      <ProductEditor
        key={initial.product.updated_at}
        id={id}
        initial={initial}
        categories={categories}
      />
    </>
  );
}
