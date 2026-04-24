import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// ⚠️ فقط في API Routes — لا تستورد في 'use client' أو Server Components العامة
export function createAdminClient() {
  return createClient<Database>(
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

// Singleton للاستخدام في API routes (module loaded once per worker)
export const supabaseAdmin = createAdminClient();
