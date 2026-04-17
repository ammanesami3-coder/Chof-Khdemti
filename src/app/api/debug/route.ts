/**
 * نقطة تشخيص — للتطوير فقط.
 * GET  /api/debug  → فحص الاتصال والجداول
 * POST /api/debug  → اختبار تسجيل دخول { email, password }
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const results: Record<string, unknown> = {
    env: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING",
      anonKeyPrefix:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) ?? "MISSING",
      serviceKeyPrefix:
        process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) ?? "MISSING",
    },
  };

  try {
    const admin = createAdminClient();

    // اختبر auth admin
    const { data: usersData, error: usersError } =
      await admin.auth.admin.listUsers({ perPage: 5 });
    results["auth_admin"] = usersError
      ? { ok: false, error: usersError.message }
      : { ok: true, totalAuthUsers: usersData.total_count };

    // اختبر جدول users
    const { error: tableError, count } = await admin
      .from("users")
      .select("*", { count: "exact", head: true });
    results["table_users"] = tableError
      ? { ok: false, error: tableError.message, code: tableError.code }
      : { ok: true, rows: count };

    // اختبر جدول subscriptions
    const { error: subError, count: subCount } = await admin
      .from("subscriptions")
      .select("*", { count: "exact", head: true });
    results["table_subscriptions"] = subError
      ? { ok: false, error: subError.message, code: subError.code }
      : { ok: true, rows: subCount };

    // اختبر SSR client (anon key)
    const supabase = await createClient();
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    results["ssr_client"] = sessionError
      ? { ok: false, error: sessionError.message }
      : { ok: true, hasSession: !!sessionData.session };

  } catch (e) {
    results["exception"] = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(results, { status: 200 });
}

// POST: اختبر signInWithPassword مباشرة
export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email: string;
    password: string;
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, status: error.status, code: error.code },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id,
      email: data.user?.email,
      hasSession: !!data.session,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, exception: e instanceof Error ? e.message : String(e) },
      { status: 200 }
    );
  }
}
