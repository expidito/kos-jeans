import { NextRequest } from "next/server";
import {
  checkoutConfigured,
  json,
  SESSION_COOKIE,
  cookieOptions,
  newToken,
} from "@/lib/checkout/server";
export async function GET(request: NextRequest) {
  if (!checkoutConfigured())
    return json({ error: "Тестове оформлення ще не налаштоване." }, 503);
  const current = request.cookies.get(SESSION_COOKIE)?.value;
  const token =
    current && /^[a-f0-9]{64}$/.test(current) ? current : newToken();
  const r = json({ ready: true });
  r.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return r;
}
