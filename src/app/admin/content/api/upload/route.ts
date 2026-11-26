import {preparePhoto} from '@/lib/media/transform';
import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { mutationSession, json, boundedBody } from "@/lib/admin/products/http";
import { uuid } from "@/lib/admin/products/validation";
import { imageExtension, maxCategoryImage } from "@/lib/categories/validation";
export async function POST(request: NextRequest) {
  const session = await mutationSession(request);
  if (session.response) return session.response;
  try {
    const type = request.headers.get("content-type");
    if (!type?.startsWith("multipart/form-data;"))
      return json({ error: "Оберіть файл." }, 415);
    const buffer = await boundedBody(request, 4 * 1024 * 1024),
      form = await new Response(new Uint8Array(buffer), {
        headers: { "Content-Type": type },
      }).formData(),
      id = uuid(form.get("banner_id")),
      file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > maxCategoryImage)
      return json({ error: "Фото JPEG, PNG або WebP до 3 МБ." }, 422);
    const original = new Uint8Array(await file.arrayBuffer());
    imageExtension(file.type,original);
    const bytes=await preparePhoto(original,file.type),ext="webp";
    const row = await session.client
      .from("homepage_banners")
      .select("id,archived_at")
      .eq("id", id)
      .maybeSingle();
    if (row.error || !row.data || row.data.archived_at)
      return json({ error: "Чернетка банера недоступна." }, 404);
    const path = `banners/${id}/${createHash("sha256").update(bytes).digest("hex")}.${ext}`;
    const result = await session.client.storage
      .from("store-media")
      .upload(path, bytes, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "0",
      });
    if (result.error && String(result.error.statusCode) !== "409")
      return json(
        { error: "Не вдалося завантажити фото. Повторіть спробу." },
        503,
      );
    return json({ path });
  } catch {
    return json({ error: "Перевірте тип і розмір зображення." }, 422);
  }
}
