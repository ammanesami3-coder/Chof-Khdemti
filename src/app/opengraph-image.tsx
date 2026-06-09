import { ImageResponse } from 'next/og';

// Default social-share card for the whole site (home + any route without its
// own opengraph-image). 1200×630 is the canonical OG/Twitter size.
export const alt = 'شوف خدمتي — Chof Khdemti | منصة الحرفيين المغاربة';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * satori (the engine behind ImageResponse) bundles a Latin-only font, so Arabic
 * renders as blank boxes unless we supply an Arabic-capable font. We fetch
 * Tajawal Bold — a *static* TTF (satori cannot parse variable fonts, which crash
 * with a glyph-table error). If the fetch ever fails the card still renders with
 * the Latin brand as the hero, so it's never broken.
 */
async function loadArabicFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf',
    );
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function Image() {
  const arabicFont = await loadArabicFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 60,
          color: 'white',
          background: 'linear-gradient(135deg, #DC2626 0%, #16A34A 100%)',
          fontFamily: arabicFont ? 'Tajawal' : 'sans-serif',
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -1 }}>
          Chof Khdemti
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 8 }}>
          شوف خدمتي
        </div>
        <div style={{ fontSize: 30, opacity: 0.92, marginTop: 24 }}>
          منصة الحرفيين والخدمات في المغرب 🇲🇦
        </div>
        <div style={{ fontSize: 24, opacity: 0.8, marginTop: 10 }}>
          Artisans &amp; services au Maroc
        </div>
      </div>
    ),
    {
      ...size,
      ...(arabicFont
        ? { fonts: [{ name: 'Tajawal', data: arabicFont, style: 'normal' as const, weight: 700 as const }] }
        : {}),
    },
  );
}
