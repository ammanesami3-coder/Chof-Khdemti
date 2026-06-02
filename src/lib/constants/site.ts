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
