import {preparePhoto} from '@/lib/media/transform';

import {FormError} from "@/lib/form-error";
import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import {
  mutationSession,
  json,
  boundedBody,
  dbMessage,
} from "@/lib/admin/products/http";
import { uuid } from "@/lib/admin/products/validation";
import { imageExtension, maxCategoryImage } from "@/lib/categories/validation";
import { cleanupProductMedia } from "@/lib/admin/products/cleanup";
export async function POST(request: NextRequest) {
  const session = await mutationSession(request);
  if (session.response) return session.response;
  const { client } = session;
  try {
    const type = request.headers.get("content-type");
    if (!type?.startsWith("multipart/form-data;"))
      return json({ error: "Оберіть файл для завантаження." }, 415);
    const buffer = await boundedBody(request, 4 * 1024 * 1024);
    const form = await new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": type },
    }).formData();
    const id = uuid(form.get("product_id")),
      imageId = uuid(form.get("image_id")),
      file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > maxCategoryImage)
      throw new FormError("Фото має бути JPEG, PNG або WebP до 3 МБ.");
    const original = new Uint8Array(await file.arrayBuffer());
    imageExtension(file.type,original);
    const bytes = await preparePhoto(original,file.type),
      extension = "webp",
      digest = createHash("sha256").update(bytes).digest("hex");
    await cleanupProductMedia(client);
    const args = {
      p_product_id: id,
      p_image_id: imageId,
      p_extension: extension,
      p_digest: digest,
    };
    const staged = await client.rpc("admin_product_upload", args);
    if (staged.error) return json({ error: dbMessage(staged.error.code) }, 422);
    const upload = await client.storage
      .from("store-media")
      .upload(staged.data, bytes, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "0",
      });
    if (upload.error && String(upload.error.statusCode) !== "409")
      return json(
        {
          error:
            "Не вдалося завантажити фото. Повторіть спробу; попередні фото збережено.",
        },
        503,
      );
    const ready = await client.rpc("admin_product_upload", {
      ...args,
      p_ready: true,
    });
    if (ready.error)
      return json(
        { error: "Не вдалося підтвердити завантаження. Повторіть спробу." },
        503,
      );
    return json({ id: imageId });
  } catch (error) {
    return json(
      {
        error:
          error instanceof FormError
            ? error.message
            : "Не вдалося завантажити фото.",
      },
      422,
    );
  }
}
