import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin client using SERVICE_ROLE_KEY.
 * Server-only — NEVER import in client components.
 * Used for: creating/deleting users in Supabase Auth.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
