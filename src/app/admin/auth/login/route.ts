import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminConfigured, validCredentials } from '@/lib/admin/policy';
import { authRedirect, loginFields, rejectCrossOrigin } from '@/lib/admin/forms';

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  if (!adminConfigured()) return authRedirect(request, '/admin/login?error=unavailable');
  try {
    const { email, password } = await loginFields(request);
    if (!validCredentials(email, password)) return authRedirect(request, '/admin/login?error=credentials');
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return authRedirect(request, `/admin/login?error=${error.status === 429 ? 'rate' : 'credentials'}`);
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user) {
      await client.auth.signOut({ scope: 'local' });
      return authRedirect(request, '/admin/login?error=credentials');
    }
    const role = await client.rpc('is_store_admin');
    if (role.error || role.data !== true) {
      await client.auth.signOut({ scope: 'local' });
      return authRedirect(request, `/admin/login?error=${role.error ? 'unavailable' : 'forbidden'}`);
    }
    return authRedirect(request, '/admin');
  } catch { return authRedirect(request, '/admin/login?error=unavailable'); }
}
