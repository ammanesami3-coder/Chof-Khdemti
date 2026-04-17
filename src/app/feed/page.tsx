import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function FeedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, username, account_type")
    .eq("id", user.id)
    .single();

  const accountLabel =
    profile?.account_type === "artisan" ? "حرفي" : "زبون";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold">
          مرحباً{profile?.full_name ? `، ${profile.full_name}` : ""}!
        </h1>
        {profile?.username && (
          <p className="text-muted-foreground" dir="ltr">
            @{profile.username}
          </p>
        )}
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm text-primary font-medium">
          {accountLabel}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        ✓ تسجيل الدخول يعمل بشكل صحيح — هذه الصفحة مؤقتة
      </p>

      {/* زر تسجيل الخروج */}
      <form action="/logout" method="POST">
        <Button type="submit" variant="outline">
          تسجيل الخروج
        </Button>
      </form>
    </div>
  );
}
