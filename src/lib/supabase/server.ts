import "server-only";
import {supabaseFetch} from "./fetch";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

// Request scoped, using the same publishable key and RLS as the browser.
// Auth session refresh must run in a writable Route Handler / Server Action.
export async function createClient() {
  const { url, key } = getSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: !!process.env.VERCEL },
    global: { fetch: supabaseFetch },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        // In read-only Server Components, defer refresh to the future Auth proxy.
        // Do not use this client to implement login in a Server Component.
        try {
          for (const { name, value, options } of values) cookieStore.set(name, value, options);
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Cookies can only be modified")) throw error;
        }
      },
    },
  });
}
