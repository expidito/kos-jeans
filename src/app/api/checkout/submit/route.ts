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
import { checkoutInput } from "@/lib/checkout/validation";
import { resolveCart } from "@/lib/cart/data";
export async function POST(request: NextRequest) {
  if (originRejected(request))
    return json({ error: "Заборонений запит." }, 403);
  if (!checkoutConfigured())
    return json({ error: "Тестове оформлення ще не налаштоване." }, 503);
  const owner = session(request);
  if (!owner) return json({ error: "Оновіть сторінку оформлення." }, 401);
  let input;
  try {
    input = checkoutInput(await body(request));
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && e.message !== "invalid"
            ? e.message
            : "Перевірте контактні дані та кошик.",
        kind: "validation",
      },
      422,
    );
  }
  try {
    if (!(await allowRequest(request, owner))) return rateLimited();
    const result = await checkoutClient().rpc("checkout_submit", {
      p_key: input.key,
      p_session: owner,
      p_values: { customer: input.customer, items: input.items },
    });
    if (!result.error) return receiptResponse(input.key, result.data);
    if (result.error.code === "P0010" || result.error.code === "P0011") {
      const rows = await resolveCart(
        input.items.map(({ variantId, quantity }) => ({ variantId, quantity })),
      );
      return json(
        {
          error:
            result.error.code === "P0010"
              ? "Ціни змінилися. Перевірте нову суму та підтвердьте замовлення повторно."
              : "Залишки або доступність змінилися. Скоригуйте кошик.",
          kind: result.error.code === "P0010" ? "price" : "stock",
          rows,
        },
        409,
      );
    }
    if (result.error.code === "P0012")
      return json(
        {
          error:
            "Цей запит уже використано з іншими даними. Перевірте стан попереднього замовлення.",
          kind: "conflict",
        },
        409,
      );
    return json(
      {
        error: "Не вдалося підтвердити замовлення. Повторіть той самий запит.",
        kind: "retry",
      },
      503,
    );
  } catch {
    return json(
      {
        error:
          "З’єднання перервано. Перевірте стан або повторіть той самий запит; новий номер запиту не створюється.",
        kind: "retry",
      },
      503,
    );
  }
}
