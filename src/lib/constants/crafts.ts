// Legacy-shaped craft exports, now derived from the single source of truth in
// localization.ts. Keep this API (name_ar/name_fr/name_en + helpers) so existing
// importers stay working; edit the data in localization.ts.
import { CRAFTS as L_CRAFTS, type CraftCategory, type Lang } from './localization';

export type { CraftCategory };

export type Craft = {
  id: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  icon: string;
  category: CraftCategory;
};

export const CRAFTS: Craft[] = L_CRAFTS.map((c) => ({
  id: c.id,
  name_ar: c.ar,
  name_fr: c.fr,
  name_en: c.en,
  icon: c.icon,
  category: c.category,
}));

export function getCraftById(id: string): Craft | null {
  return CRAFTS.find((c) => c.id === id) ?? null;
}

/** Craft name in the requested language, matched by id OR (legacy) Arabic name. */
export function getCraftName(idOrArabicName: string, lang: Lang): string {
  const craft =
    CRAFTS.find((c) => c.id === idOrArabicName) ??
    CRAFTS.find((c) => c.name_ar === idOrArabicName);
  if (!craft) return idOrArabicName;
  return lang === 'fr' ? craft.name_fr : lang === 'en' ? craft.name_en : craft.name_ar;
}
