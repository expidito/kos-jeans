export function checkoutAvailable(env: Record<string, string | undefined>) {
  return (
    env.VERCEL_ENV !== "production" &&
    !!env.NEXT_PUBLIC_SUPABASE_URL &&
    !!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !!env.SUPABASE_CHECKOUT_SECRET_KEY?.startsWith("sb_secret_")
  );
}
