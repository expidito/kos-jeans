export const adminSections = [
  { href: '/admin', label: 'Dashboard', block: 8 },
  { href: '/admin/products', label: 'Товари', block: 10 },
  { href: '/admin/products/new', label: 'Додати товар', block: 10 },
  { href: '/admin/categories', label: 'Категорії', block: 9 },
  { href: '/admin/orders', label: 'Замовлення', block: 13 },
  { href: '/admin/banners', label: 'Банери', block: 14 },
  { href: '/admin/settings', label: 'Налаштування', block: 14 },
] as const;

export function adminConfigured(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_ENV !== 'production' && !!env.NEXT_PUBLIC_SUPABASE_URL && !!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

export function validCredentials(email: string, password: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length > 0 && password.length <= 1024;
}

// Fail closed: only an Auth-validated identity AND the database role grant access.
export async function verifyAdmin(
  identity: () => Promise<{ id: string; email?: string } | null>,
  role: () => Promise<boolean>,
) {
  const user = await identity();
  if (!user) return { status: 'unauthenticated' as const };
  if (!(await role())) return { status: 'forbidden' as const };
  return { status: 'admin' as const, user };
}

export function sameOrigin(origin: string | null, requestUrl: string) {
  if (!origin || origin === 'null') return false;
  try { return new URL(origin).origin === new URL(requestUrl).origin; } catch { return false; }
}
