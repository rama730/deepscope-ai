import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Creates a Supabase Admin Client with SERVICE_ROLE key.
 * ⚠️ DANGER: This client bypasses RLS. Use only in secure server contexts.
 * Do NOT expose this to the client side.
 */
export function createSupabaseAdmin() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing. Cannot create Admin client.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
