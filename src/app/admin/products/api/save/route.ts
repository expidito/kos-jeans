import type { NextRequest } from "next/server";
import {
  mutationSession,
  json,
  boundedBody,
  dbMessage,
} from "@/lib/admin/products/http";
import { object, productInput, uuid } from "@/lib/admin/products/validation";
import { cleanupProductMedia } from "@/lib/admin/products/cleanup";
export async function POST(request: NextRequest) {
  const session = await mutationSession(request);
  if (session.response) return session.response;
  const { client } = session;
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "Невірний формат запиту." }, 415);
    const body = object(
        JSON.parse((await boundedBody(request, 256 * 1024)).toString("utf8")),
      ),
      id = uuid(body.id),
      requestId = uuid(body.request_id),
      command = String(body.command);
    if (!["reserve", "save", "archive"].includes(command))
      throw Error("Невідома дія.");
    const version =
      body.version === null
        ? null
        : typeof body.version === "string"
          ? body.version
          : null;
    const values = command === "archive" ? {} : productInput(body.product);
    const result = await client.rpc("admin_product_write", {
      p_product_id: id,
      p_request_id: requestId,
      p_values: values,
      p_expected_version: version ?? undefined,
      p_command: command,
    });
    if (result.error)
      return json(
        { error: dbMessage(result.error.code) },
        result.error.code === "40001" ? 409 : 422,
      );
    const current = await client
      .from("products")
      .select("updated_at,slug,status")
      .eq("id", id)
      .single();
    if (current.error)
      return json(
        { error: "Товар збережено, але сторінку потрібно оновити." },
        503,
      );
    await cleanupProductMedia(client);
    return json({
      id,
      version: current.data.updated_at,
      slug: current.data.slug,
      status: current.data.status,
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof SyntaxError
            ? "Невірний формат даних."
            : error instanceof Error
              ? error.message
              : "Не вдалося зберегти товар.",
      },
      422,
    );
  }
}
