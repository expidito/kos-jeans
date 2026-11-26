import type { NextRequest } from "next/server";
import { mutationSession, json, boundedBody } from "@/lib/admin/products/http";
import { uuid, object } from "@/lib/admin/products/validation";
import {
  bannerInput,
  settingInput,
  contentKeys,
  type ContentKey,
} from "@/lib/content/policy";
export async function POST(request: NextRequest) {
  const session = await mutationSession(request);
  if (session.response) return session.response;
  try {
    if (
      request.headers.get("content-type")?.split(";")[0] !== "application/json"
    )
      return json({ error: "Невірний формат запиту." }, 415);
    const b = object(
        JSON.parse((await boundedBody(request, 64 * 1024)).toString("utf8")),
      ),
      kind = String(b.kind),
      command = String(b.command ?? "save"),
      target = String(b.target ?? ""),
      requestId = uuid(b.request_id);
    if (
      !["banner", "setting"].includes(kind) ||
      !["reserve", "save", "archive"].includes(command)
    )
      throw Error();
    if (kind === "banner") uuid(target);
    else if (!contentKeys.includes(target as ContentKey) || command !== "save")
      throw Error();
    const version =
      b.version === null
        ? undefined
        : typeof b.version === "string" &&
            b.version.length <= 40 &&
            !Number.isNaN(Date.parse(b.version))
          ? b.version
          : (() => {
              throw Error();
            })();
    const values =
      kind === "setting"
        ? settingInput(target as ContentKey, b.values)
        : command === "save"
          ? bannerInput(b.values)
          : {};
    const { data, error } = await session.client.rpc("admin_content_write", {
      p_kind: kind,
      p_target: target,
      p_command: command,
      p_request: requestId,
      p_version: version,
      p_values: values,
    });
    if (error)
      return json(
        {
          error:
            error.code === "40001"
              ? "Контент уже змінено в іншій вкладці. Оновіть сторінку перед повтором."
              : error.code === "P0012"
                ? "Запит уже використано для інших даних. Оновіть сторінку."
                : error.code === "23514"
                  ? "Перевірте фото, доступність посилання, дати й повноту банера."
                  : "Не вдалося зберегти. Перевірте дані або повторіть запит.",
        },
        error.code === "40001" ? 409 : 422,
      );
    return json(data);
  } catch {
    return json(
      { error: "Перевірте поля, формат посилань, дати та розмір запиту." },
      422,
    );
  }
}
