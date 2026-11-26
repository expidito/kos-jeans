import "server-only";
import {FormError} from "@/lib/form-error";

import { NextResponse, type NextRequest } from "next/server";
import { adminSession } from "@/lib/admin/auth";
import { rejectCrossOrigin } from "@/lib/admin/forms";
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function mutationSession(request: NextRequest) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return { response: rejected };
  const session = await adminSession();
  if (session.status !== "admin")
    return {
      response: json(
        {
          error:
            "Сесія завершилася або немає адміністративного доступу. Увійдіть повторно.",
        },
        session.status === "unauthenticated" ? 401 : 403,
      ),
    };
  return { client: session.client };
}
export async function boundedBody(request: NextRequest, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new FormError("Порожній запит.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new FormError("Завеликий запит.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export function dbMessage(code?: string) {
  return code === "40001"
    ? "Товар уже змінено в іншому вікні. Оновіть сторінку та звірте дані."
    : code === "23505"
      ? "Такий артикул, slug або варіант уже існує. Перевірте унікальність."
      : code === "23514"
        ? "Перевірте дані. Для публікації потрібні опис, доступна категорія, фото та активні варіанти."
        : "Не вдалося зберегти дані. Спробуйте ще раз.";
}
