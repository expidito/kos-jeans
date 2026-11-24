export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured. Set the public URL and publishable key in .env.local.");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname))) {
    throw new Error("Supabase URL must use HTTPS (except local development).");
  }
  if (!key.startsWith("sb_publishable_")) throw new Error("Use a Supabase publishable key, never a secret or service-role key.");
  return { url: parsed.origin, key };
}
