import type { NextRequest } from "next/server";
import {
  checkoutClient,
  checkoutConfigured,
  json,
  session,
  body,
  originRejected,
  allowRequest,
  rateLimited,
  receiptResponse,
} from "@/lib/checkout/server";
import { validKey } from "@/lib/checkout/validation";
export async function POST(request: NextRequest) {
  if (originRejected(request))
    return json({ error: "Заборонений запит." }, 403);
  if (!checkoutConfigured())
    return json({ error: "Тестове оформлення ще не налаштоване." }, 503);
  const owner = session(request);
  if (!owner) return json({ error: "Оновіть сторінку оформлення." }, 401);
  try {
    const input = await body(request);
    if (!validKey(input?.key)) return json({ error: "Невірний запит." }, 422);
    if (!(await allowRequest(request, owner))) return rateLimited();
    const result = await checkoutClient().rpc("checkout_status", {
      p_key: input.key,
      p_session: owner,
    });
    if (result.error)
      return json(
        { error: "Не вдалося перевірити стан. Повторіть спробу." },
        503,
      );
    return result.data
      ? receiptResponse(input.key, result.data)
      : json({ receipt: null });
  } catch {
    return json(
      { error: "Не вдалося перевірити стан. Повторіть спробу." },
      503,
    );
  }
}
