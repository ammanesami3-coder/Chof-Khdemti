import { SITE_NAME, SITE_NAME_AR, SITE_URL, SITE_DESCRIPTION } from "@/lib/constants/site";
import { getCraftName } from "@/lib/constants/crafts";
import { getCityName } from "@/lib/constants/cities";

/**
 * Organization + WebApplication JSON-LD for the home view. Tells search
 * engines exactly what "Chof Khdemti" is, its canonical URL, logo, and the
 * search entry point. Rendered server-side as a raw <script> (Next strips
 * <script> from React children otherwise).
 */
export function HomeJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        // Native Arabic brand + common variants so Google links the query
        // "شوف خدمتي" to this entity, not just the Latin spelling.
        alternateName: [SITE_NAME_AR, "Chofkhdemti", "Chouf Khdemti"],
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        image: `${SITE_URL}/icon-512.png`,
        description: SITE_DESCRIPTION,
        areaServed: { "@type": "Country", name: "Morocco" },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: SITE_NAME,
        alternateName: SITE_NAME_AR,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: ["ar", "fr", "en"],
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers: {
          "@type": "Offer",
          price: "99",
          priceCurrency: "MAD",
          description: "اشتراك شهري للحرفيين — تجربة مجانية 30 يوماً",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: SITE_NAME_AR,
        inLanguage: ["ar", "fr", "en"],
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Trusted, server-built object — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

type ProfileJsonLdInput = {
  username: string;
  full_name: string;
  craft_category: string | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  avgRating: number | null;
  totalRatingsCount: number;
};

/**
 * Person + (when rated) AggregateRating JSON-LD for an artisan profile. Lets
 * Google show the craftsman as a rich result with stars. Craft/city are
 * resolved to Arabic labels (the helpers fall back gracefully for legacy or
 * unknown values), so the markup always carries human-readable terms.
 */
export function ProfilePersonJsonLd({ profile }: { profile: ProfileJsonLdInput }) {
  const craft = profile.craft_category ? getCraftName(profile.craft_category, "ar") : "";
  const city = profile.city ? getCityName(profile.city, "ar") : "";

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.full_name,
    url: `${SITE_URL}/profile/${profile.username}`,
    ...(craft ? { jobTitle: craft } : {}),
    ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
    ...(profile.bio ? { description: profile.bio } : {}),
    ...(city
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: city,
            addressCountry: "MA",
          },
        }
      : {}),
    ...(profile.avgRating && profile.totalRatingsCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: profile.avgRating,
            ratingCount: profile.totalRatingsCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
    />
  );
}
