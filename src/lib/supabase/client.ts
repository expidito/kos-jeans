"use client";

import {supabaseFetch} from "./fetch";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

// RLS is always enforced with the visitor's session; no privileged key here.
export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient<Database>(url, key, {global:{fetch:supabaseFetch}});
}
