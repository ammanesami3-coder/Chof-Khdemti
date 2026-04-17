"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signUpSchema, signInSchema } from "@/lib/validations/auth";
import type { SignUpInput, SignInInput } from "@/lib/validations/auth";

// ---------------------------------------------------------------
// signUp
// نستعمل adminClient.auth.admin.createUser لأن SSR client
// مع مفاتيح sb_publishable_ قد يفشل في بعض الإعدادات.
// ---------------------------------------------------------------
export async function signUp(
  input: SignUpInput
): Promise<{ error?: string }> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "بيانات غير صالحة" };
  }

  const { email, password, full_name, username, account_type } = parsed.data;
  const adminClient = createAdminClient();

  // 1. تحقق من username قبل إنشاء auth user
  const { count: usernameCount, error: checkError } = await adminClient
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("username", username);

  if (checkError && checkError.code !== "42P01") {
    console.error("[signUp] username check:", checkError);
  }
  if (checkError?.code === "42P01") {
    return { error: "جداول قاعدة البيانات غير موجودة — يرجى تشغيل migrations أولاً" };
  }
  if (usernameCount && usernameCount > 0) {
    return { error: "اسم المستخدم مستعمل بالفعل، اختر اسماً آخر" };
  }

  // 2. أنشئ المستخدم عبر Admin API
  // email_confirm: true → تجاوز تأكيد البريد (مناسب لـ MVP)
  const { data: createData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name, username, account_type },
      email_confirm: true,
    });

  if (createError) {
    console.error("[signUp] admin.createUser error:", createError.message);
    if (
      createError.message.toLowerCase().includes("already been registered") ||
      createError.message.toLowerCase().includes("already registered")
    ) {
      return { error: "هذا البريد الإلكتروني مسجل بالفعل" };
    }
    return { error: `فشل إنشاء الحساب: ${createError.message}` };
  }

  const userId = createData.user.id;

  // 3. تحقق هل الـ trigger (0005) أنشأ public.users تلقائياً
  const { error: rowCheck } = await adminClient
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  if (rowCheck) {
    // الـ trigger لم يعمل — أنشئ يدوياً
    const { error: insertError } = await adminClient.from("users").insert({
      id: userId,
      username,
      full_name,
      account_type,
    });

    if (insertError) {
      console.error("[signUp] users insert:", insertError);
      if (insertError.code === "23505") {
        await adminClient.auth.admin.deleteUser(userId);
        return { error: "اسم المستخدم مستعمل بالفعل" };
      }
      return { error: `خطأ قاعدة البيانات: ${insertError.message}` };
    }

    await adminClient
      .from("profiles")
      .insert({ user_id: userId })
      .then(() => null, () => null);
  }

  // 4. سجّل الدخول تلقائياً لتأسيس الجلسة
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // الحساب أُنشئ لكن الجلسة لم تُؤسَّس — المستخدم يستطيع تسجيل الدخول يدوياً
    console.error("[signUp] auto sign-in:", signInError.message);
  }

  return {};
}

// ---------------------------------------------------------------
// signIn
// ---------------------------------------------------------------
export async function signIn(
  input: SignInInput
): Promise<{ error?: string }> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "بيانات غير صالحة" };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[signIn] error:", error.message, error.status);

    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "لم يتم تأكيد البريد الإلكتروني — تحقق من صندوق الوارد" };
    }
    if (
      error.message.toLowerCase().includes("invalid login credentials") ||
      error.message.toLowerCase().includes("invalid credentials")
    ) {
      return { error: "البريد الإلكتروني أو كلمة السر غير صحيحة" };
    }

    return { error: `خطأ تسجيل الدخول: ${error.message}` };
  }

  return {};
}
