import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminConfigured } from '@/lib/admin/policy';
import { authRedirect, rejectCrossOrigin } from '@/lib/admin/forms';

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  if (adminConfigured()) {
    // Logout is allowed even after role revocation / token expiry.
    const client = await createClient();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) return authRedirect(request, '/admin/login?error=logout');
  }
  return authRedirect(request, '/admin/login?notice=logout');
}
