import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminConfigured, verifyAdmin } from './policy';

export async function adminSession() {
  if (!adminConfigured()) return { status: 'unavailable' as const };
  try {
    const client = await createClient();
    const result = await verifyAdmin(async () => {
      // Never authorize from getSession(), cookies, or user/app metadata.
      const { data, error } = await client.auth.getUser();
      return error ? null : data.user;
    }, async () => {
      const { data, error } = await client.rpc('is_store_admin');
      if (error) throw new Error('Role verification unavailable');
      return data === true;
    });
    return { ...result, client };
  } catch { return { status: 'unavailable' as const }; }
}

// Every private data operation calls this, independently of layouts and Proxy.
export async function requireAdmin() {
  const session = await adminSession();
  if (session.status !== 'admin') redirect(`/admin/login?error=${session.status === 'unavailable' ? 'unavailable' : session.status === 'forbidden' ? 'forbidden' : 'session'}`);
  return { user: session.user, client: session.client };
}
