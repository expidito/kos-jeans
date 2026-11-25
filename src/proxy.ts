import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/session";
import { adminConfigured } from "@/lib/admin/policy";

export async function proxy(request: NextRequest) {
  const response =
    request.nextUrl.pathname.startsWith("/admin") && adminConfigured()
      ? await refreshSession(request)
      : NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Referrer-Policy",
    request.nextUrl.pathname.startsWith("/admin")
      ? "same-origin"
      : "no-referrer",
  );
  return response;
}
export const config = {
  matcher: ["/admin/:path*", "/checkout/:path*", "/api/checkout/:path*"],
};
