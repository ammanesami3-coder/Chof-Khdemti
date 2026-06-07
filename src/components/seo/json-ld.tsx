import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/constants/site";

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
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description: SITE_DESCRIPTION,
        areaServed: { "@type": "Country", name: "Morocco" },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: SITE_NAME,
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
