import { NextResponse } from "next/server";
import { cartInput } from "@/lib/cart/model";
import { resolveCart } from "@/lib/cart/data";
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function POST(request: Request) {
  let items;
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return response({ error: "Невірний формат запиту." }, 415);
    const reader = request.body?.getReader();
    if (!reader) throw Error();
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 12000) {
        await reader.cancel();
        return response({ error: "Завеликий кошик." }, 413);
      }
      chunks.push(value);
    }
    items = cartInput(JSON.parse(Buffer.concat(chunks).toString("utf8")).items);
  } catch {
    return response({ error: "Перевірте вміст кошика та кількість." }, 422);
  }
  try {
    return response({ rows: await resolveCart(items) });
  } catch {
    return response(
      {
        error:
          "Не вдалося звірити ціни та залишки. Перевірте з’єднання і спробуйте ще раз.",
      },
      503,
    );
  }
}
