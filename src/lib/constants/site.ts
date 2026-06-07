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
  // Brand + common typos
  'Chof Khdemti',
  'Chouf khdemti',
  'Chofkhdmti',
  'Shof khdemti',
  'شوف خدمتي',
  'شوف خمدتي',
  'شوف خدامتي',
  'شوف خدماتي',
  // Service terms — FR / EN
  'Artisans Maroc',
  'Plombier',
  'Electricien',
  'Zellaji',
  'Sebbagh',
  // Service terms — AR
  'حرفيين في المغرب',
  'معلم زليج',
  'بلومبي',
  'كهربائي منازل',
  'صباغ',
];
