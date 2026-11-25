import "server-only";
import { checkoutAvailable } from "./policy";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { rejectCrossOrigin } from "@/lib/admin/forms";
export const SESSION_COOKIE = "kos_checkout_session",
  RECEIPT_COOKIE = "kos_checkout_receipt";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.VERCEL === "1",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
export function checkoutConfigured() {
  return checkoutAvailable(process.env);
}
export function checkoutClient() {
  if (!checkoutConfigured()) throw Error("Checkout unavailable");
  const { url } = getSupabaseConfig();
  return createClient<Database>(
    url,
    process.env.SUPABASE_CHECKOUT_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            cache: "no-store",
            signal: AbortSignal.timeout(20000),
          }),
      },
    },
  );
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    },
  });
}
export function hash(value: string) {
  return createHmac("sha256", process.env.SUPABASE_CHECKOUT_SECRET_KEY!)
    .update(value)
    .digest("hex");
}
export function session(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token && /^[a-f0-9]{64}$/.test(token)
    ? hash("session:" + token)
    : null;
}
export function newToken() {
  return randomBytes(32).toString("hex");
}
export function originRejected(request: NextRequest) {
  return !!rejectCrossOrigin(request);
}
export async function body(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw Error("invalid");
  const reader = request.body?.getReader();
  if (!reader) throw Error("invalid");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 16000) {
      await reader.cancel();
      throw Error("invalid");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Error("invalid");
  }
}
export async function allowRequest(request: NextRequest, sessionHash: string) {
  const address =
    process.env.VERCEL === "1"
      ? (request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        "unknown")
      : "local-development";
  const ip = process.env.VERCEL === "1" && !isIP(address) ? "unknown" : address;
  const result = await checkoutClient().rpc("checkout_throttle", {
    p_keys: [
      "global:" + hash("global-v1"),
      "ip:" + hash("ip:" + ip),
      "session:" + sessionHash,
    ],
  });
  if (result.error) throw Error("Throttle unavailable");
  return result.data;
}
export function rateLimited() {
  const r = json(
    {
      error: "Забагато спроб. Повторіть оформлення через 10 хвилин.",
      kind: "rate",
    },
    429,
  );
  r.headers.set("Retry-After", "600");
  return r;
}
export function receiptResponse(key: string, receipt: unknown) {
  const r = json({ receipt });
  r.cookies.set(RECEIPT_COOKIE, key, cookieOptions);
  return r;
}
