import { requireAdmin } from "@/lib/admin/auth";
import { CreateBanner } from "@/components/admin/content/create-banner";
export default async function NewBanner() {
  await requireAdmin();
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl tracking-tight">Новий банер</h1>
      <p className="my-6 text-sm leading-7 text-muted">
        Створіть приватну чернетку, потім додайте фото, текст і сторінку для
        кнопки. До публікації банер не з’явиться в магазині.
      </p>
      <CreateBanner />
    </div>
  );
}
