import type { NextRequest } from "next/server";
import { mutationSession, boundedBody, json } from "@/lib/admin/products/http";
import { orderStatus } from "@/lib/admin/orders/policy";
export async function POST(request: NextRequest) {
  const session = await mutationSession(request);
  if (session.response) return session.response;
  try {
    if (
      request.headers.get("content-type")?.split(";")[0] !== "application/json"
    )
      return json({ error: "Невірний формат запиту." }, 415);
    const b = JSON.parse((await boundedBody(request, 2048)).toString("utf8"));
    if (
      !b ||
      typeof b.id !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
        b.id,
      ) ||
      !orderStatus(b.status) ||
      typeof b.version !== "string" ||
      b.version.length > 40 ||
      !/^\d{4}-\d{2}-\d{2}T/.test(b.version) ||
      Number.isNaN(Date.parse(b.version))
    )
      return json({ error: "Перевірте дані запиту." }, 422);
    const { data, error } = await session.client.rpc("admin_order_status", {
      p_order: b.id,
      p_expected_version: b.version,
      p_status: b.status,
    });
    if (error)
      return json(
        {
          error:
            error.code === "40001"
              ? "Замовлення вже змінено іншим адміністратором. Оновіть сторінку та звірте статус."
              : error.code === "23514"
                ? "Цей перехід статусу недоступний. Скасоване замовлення не можна відновити."
                : error.code === "42501"
                  ? "Немає адміністративного доступу."
                  : "Не вдалося змінити статус. Оновіть сторінку.",
        },
        error.code === "40001" ? 409 : error.code === "42501" ? 403 : 422,
      );
    return json(data);
  } catch {
    return json({ error: "Невірний або завеликий запит." }, 422);
  }
}
