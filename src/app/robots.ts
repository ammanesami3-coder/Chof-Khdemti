import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Secure / auth-only / non-content surfaces. Keeping these out of the
        // index protects private data and avoids wasting crawl budget.
        disallow: [
          "/login",
          "/signup",
          "/logout",
          "/callback",
          "/auth/",
          "/onboarding",
          "/messages",
          "/notifications",
          "/saved",
          "/settings",
          "/settings/moderators",
          "/settings/reports",
          "/profile/edit",
          "/banned",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
