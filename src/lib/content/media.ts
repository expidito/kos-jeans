import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
export const bannerHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
};
export async function bannerMedia(
  client: SupabaseClient<Database>,
  id: string,
) {
  try {
    const { data, error } = await client
      .from("homepage_banners")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();
    if (error)
      return new Response(null, { status: 503, headers: bannerHeaders });
    if (!data?.image_path)
      return new Response(null, { status: 404, headers: bannerHeaders });
    const file = await client.storage
      .from("store-media")
      .download(data.image_path);
    if (
      file.error ||
      !file.data ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.data.type)
    )
      return new Response(null, { status: 404, headers: bannerHeaders });
    return new Response(await file.data.arrayBuffer(), {
      headers: { ...bannerHeaders, "Content-Type": file.data.type },
    });
  } catch {
    return new Response(null, { status: 503, headers: bannerHeaders });
  }
}
