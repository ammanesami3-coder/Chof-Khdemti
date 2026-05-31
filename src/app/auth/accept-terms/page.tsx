import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { AcceptTermsClient } from "./accept-terms-client";

export const metadata: Metadata = {
  title: "الموافقة على الشروط — Chof Khdemti",
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AcceptTermsPage({ searchParams }: Props) {
  const { next } = await searchParams;
  // Only allow internal paths, and never loop back onto the gate itself.
  const safeNext =
    next?.startsWith("/") && !next.startsWith("/auth/accept-terms")
      ? next
      : undefined;

  const { supabase, user } = await requireUser();

  // If the user has already accepted, skip the gate entirely.
  // terms_accepted_at is not in the generated types yet — cast to bypass.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = (await (supabase as any)
    .from("profiles")
    .select("terms_accepted_at")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: { terms_accepted_at: string | null } | null };

  if (profile?.terms_accepted_at) {
    redirect(safeNext ?? "/feed");
  }

  return <AcceptTermsClient next={safeNext} />;
}
