import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase';
import { parseAllowlist } from '@/lib/utils';

export async function requireAdmin() {
  const sb = getSupabaseServerClient();
  const {
    data: { user }
  } = await sb.auth.getUser();

  if (!user?.email) redirect('/admin/login');

  const allowlist = parseAllowlist(process.env.ADMIN_ALLOWLIST_EMAILS);
  if (!allowlist.includes(user.email.toLowerCase())) redirect('/admin/login?error=forbidden');

  return user;
}
