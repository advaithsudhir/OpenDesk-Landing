import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS entirely. Only ever call this from
// trusted, server-only, non-user-triggered code (the weekly digest cron
// route) — never from a Server Action, a page, or anything reachable from
// a browser request. There is no session here; every query must filter by
// clinic_id explicitly, since RLS won't do it for you.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
