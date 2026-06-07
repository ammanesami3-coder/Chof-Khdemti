import type { MetadataRoute } from "next";
import { SITE_URL, LOCALES } from "@/lib/constants/site";
import { createClient } from "@/lib/supabase/server";

// Re-generate at most once an hour. Profiles change far more slowly than the
// feed, so a hard request-time fetch on every crawl would be wasteful.
export const revalidate = 3600;

/**
 * Public, indexable routes only. Auth-gated areas (/messages, /notifications,
 * /settings, /feed) are intentionally excluded — they're disallowed in
 * robots.ts and would never be indexed, so listing them here would be
 * self-contradictory.
 */
const PUBLIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/explore", changeFrequency: "daily", priority: 0.9 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

/** hreflang alternates for a path — every locale maps to the canonical URL. */
function languageAlternates(path: string): Record<string, string> {
  const url = `${SITE_URL}${path}`;
  return Object.fromEntries(LOCALES.map((l) => [l, url]));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: { languages: languageAlternates(route.path) },
  }));

  // Dynamic artisan profile routes. Public per RLS (users SELECT = everyone),
  // so the anon client is enough. Wrapped defensively so a transient DB/env
  // issue degrades to the static sitemap instead of failing the build.
  let profileEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("users")
      .select("username, updated_at")
      .eq("account_type", "artisan")
      .order("updated_at", { ascending: false })
      .limit(5000);

    profileEntries = (data ?? []).map((u) => {
      const path = `/profile/${u.username}`;
      return {
        url: `${SITE_URL}${path}`,
        lastModified: u.updated_at ? new Date(u.updated_at as string) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: { languages: languageAlternates(path) },
      };
    });
  } catch {
    // Fall back to static routes only.
  }

  return [...staticEntries, ...profileEntries];
}
