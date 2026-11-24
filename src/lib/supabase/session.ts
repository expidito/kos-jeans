import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

// Only /admin uses session cookies. Public catalog remains anonymous and stateless.
// Keep both request and response cookies in sync and never cache this response.
export async function refreshSession(request: NextRequest) {
  const { url, key } = getSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: !!process.env.VERCEL },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getSession() alone must never be used as proof of identity/role.
  try { await supabase.auth.getUser(); } catch { /* DAL independently fails closed. */ }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
