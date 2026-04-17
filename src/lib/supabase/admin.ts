import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * عميل Supabase بصلاحيات service role.
 * استخدمه فقط في Server Actions و API Routes — لا في 'use client'.
 */
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
