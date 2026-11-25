import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
export async function cleanupProductMedia(client: SupabaseClient<Database>) {
  try {
    const jobs = await client.rpc("admin_product_cleanup");
    if (jobs.error) return;
    for (const path of jobs.data ?? []) {
      if (
        !/^products\/[a-f0-9-]{36}\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/.test(path)
      )
        continue;
      const linked = await client
        .from("product_images")
        .select("id")
        .eq("storage_path", path)
        .limit(1);
      if (linked.error || linked.data.length) continue;
      const result = await client.storage.from("store-media").remove([path]);
      if (!result.error)
        await client.rpc("admin_product_cleanup", { p_done: path });
    }
  } catch {
    /* Queue persists; retry on the next product save/upload. Never log credentials. */
  }
}
