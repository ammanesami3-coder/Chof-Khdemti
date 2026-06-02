// Legacy-shaped city exports, now derived from the single source of truth in
// localization.ts. Keep this API (name_ar/name_fr/name_en + helpers) so existing
// importers stay working; edit the data in localization.ts.
import { CITIES as L_CITIES, type Lang } from './localization';

export type City = {
  id: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  region: string;
};

export const CITIES: City[] = L_CITIES.map((c) => ({
  id: c.id,
  name_ar: c.ar,
  name_fr: c.fr,
  name_en: c.en,
  region: c.region,
}));

export function getCityById(id: string): City | null {
  return CITIES.find((c) => c.id === id) ?? null;
}

/** City name in the requested language, matched by id OR (legacy) Arabic name. */
export function getCityName(idOrArabicName: string, lang: Lang): string {
  const city =
    CITIES.find((c) => c.id === idOrArabicName) ??
    CITIES.find((c) => c.name_ar === idOrArabicName);
  if (!city) return idOrArabicName;
  return lang === 'fr' ? city.name_fr : lang === 'en' ? city.name_en : city.name_ar;
}
