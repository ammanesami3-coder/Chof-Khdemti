/**
 * Canonical production URL for the platform. Single source of truth for
 * absolute links (metadata, OG images, checkout redirects, share links).
 *
 * Falls back to the production custom domain when NEXT_PUBLIC_APP_URL is unset
 * (e.g. previews that forget the env var) so we never emit localhost in prod.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://chofkhdemti.com'
).replace(/\/$/, '');

export const SITE_NAME = 'Chof Khdemti';

/** Default platform description (Arabic — the primary locale). */
export const SITE_DESCRIPTION =
  'منصة اجتماعية متخصصة للحرفيين وأصحاب الخدمات في المغرب والعالم العربي — اكتشف أفضل الحرفيين في مدينتك، شارك أعمالك، وتواصل مع آلاف الزبائن.';

/** Supported UI locales, primary first. Used for hreflang alternates. */
export const LOCALES = ['ar', 'fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * SEO keyword pool: brand variants + common typos (Latin & Arabic) plus
 * high-intent service terms across all three locales. Kept here so metadata,
 * structured data, and any future landing pages share one source of truth.
 */
export const SITE_KEYWORDS: string[] = [
  // Brand — Latin (correct + common misspellings)
  'Chof Khdemti',
  'chofkhdemti',
  'Chof Khedmti',
  'Chof Khedmati',
  'Chouf Khdemti',
  'Shof Khdemti',
  'Chof Khdimti',
  'Chof Khadmti',
  'Chouf Khadmeti',
  // Brand — Arabic (correct + common misspellings)
  'شوف خدمتي',
  'شوف خدمة',
  'شف خدمتي',
  'شوف خمدتي',
  'شوف خدامتي',
  'شوف خدماتي',
  // Darija / generic craft terms
  'حرفي',
  'صنايعي',
  'معلم',
  'خدام',
  'بلاصة حرفيين',
  // Service terms — AR
  'حرفيين المغرب',
  'خدمات منزلية المغرب',
  'كهربائي المغرب',
  'سباك المغرب',
  'نجار المغرب',
  'منصة الحرفيين',
  'معلم زليج',
  'كهربائي منازل',
  'صباغ',
  // Service terms — FR
  'artisans Maroc',
  'services à domicile Maroc',
  'trouver artisan Maroc',
  'électricien Maroc',
  'plombier Maroc',
  'menuisier Maroc',
  'Zellaji',
  'Sebbagh',
  // Service terms — EN
  'Moroccan craftsmen platform',
  'Morocco home services',
  'find artisan Morocco',
  'handyman Morocco',
];
