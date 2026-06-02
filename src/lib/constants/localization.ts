// =============================================================
// localization.ts — single source of truth for crafts & cities.
//
// Both arrays are strictly typed and carry ar (Moroccan Darija / Arabic),
// fr (French) and en (English) labels. The `id` is the STABLE key persisted
// in public.profiles.craft_category / public.profiles.city and matched by the
// search_artisans RPC — never change an existing id (it would orphan stored
// profiles and break the explore filter). Labels may change freely; add new
// entries by appending.
//
// crafts.ts and cities.ts re-derive their (legacy-shaped) exports from here,
// so this file is the only place to edit the data.
// =============================================================

export type Lang = 'ar' | 'fr' | 'en';

export type CraftCategory =
  | 'construction'
  | 'services'
  | 'food'
  | 'beauty'
  | 'tech'
  | 'other';

export type LocalizedCraft = {
  id: string;
  ar: string;
  fr: string;
  en: string;
  icon: string;
  category: CraftCategory;
};

export type LocalizedCity = {
  id: string;
  ar: string;
  fr: string;
  en: string;
  region: string;
};

/** Pick the label for the active language (Arabic is the default/fallback). */
export function localizedLabel(item: { ar: string; fr: string; en: string }, lang: Lang): string {
  return lang === 'fr' ? item.fr : lang === 'en' ? item.en : item.ar;
}

// ── Crafts (Moroccan Darija usage) ───────────────────────────────────────────
// Existing ids preserved; ar labels tuned to Darija; `plastering` and `welding`
// added for Gabbas and Soudeur.
export const CRAFTS: readonly LocalizedCraft[] = [
  { id: 'plumbing',        ar: 'سبّاك (بلومبي)',     fr: 'Plombier',                 en: 'Plumber',              icon: 'Wrench',      category: 'construction' },
  { id: 'electricity',     ar: 'كهربائي',            fr: 'Électricien',              en: 'Electrician',          icon: 'Zap',         category: 'construction' },
  { id: 'tiling',          ar: 'زلّيجي',             fr: 'Zelliji / Carreleur',      en: 'Tiler (Zellige)',      icon: 'Grid3x3',     category: 'construction' },
  { id: 'plastering',      ar: 'جبّاص',              fr: 'Plâtrier',                 en: 'Plasterer',            icon: 'Layers',      category: 'construction' },
  { id: 'painting',        ar: 'صبّاغ',              fr: 'Peintre',                  en: 'Painter',              icon: 'PaintBucket', category: 'construction' },
  { id: 'carpentry',       ar: 'نجّار',              fr: 'Menuisier',                en: 'Carpenter',            icon: 'Hammer',      category: 'construction' },
  { id: 'welding',         ar: 'لحّام (صدّور)',       fr: 'Soudeur',                  en: 'Welder',               icon: 'Flame',       category: 'construction' },
  { id: 'mechanic',        ar: 'ميكانيكي',           fr: 'Mécanicien',               en: 'Mechanic',             icon: 'Car',         category: 'services' },
  { id: 'construction',    ar: 'بنّاي',              fr: 'Maçon',                    en: 'Mason / Builder',      icon: 'Building2',   category: 'construction' },
  { id: 'tailoring',       ar: 'خيّاط',              fr: 'Tailleur',                 en: 'Tailor',               icon: 'Scissors',    category: 'services' },
  { id: 'ac-repair',       ar: 'فريغوريست (تبريد)',  fr: 'Frigoriste',               en: 'Refrigeration Tech',   icon: 'Wind',        category: 'construction' },
  { id: 'barber',          ar: 'حلّاق',              fr: 'Coiffeur (homme)',         en: "Men's Barber",         icon: 'User',        category: 'beauty' },
  { id: 'hairdresser',     ar: 'حلّاقة نساء',        fr: 'Coiffeuse (femme)',        en: "Women's Hairdresser",  icon: 'Sparkles',    category: 'beauty' },
  { id: 'skincare',        ar: 'العناية بالبشرة',    fr: 'Soins de la peau',         en: 'Skincare',             icon: 'Heart',       category: 'beauty' },
  { id: 'cooking',         ar: 'طبّاخ',              fr: 'Cuisinier',                en: 'Cook / Chef',          icon: 'ChefHat',     category: 'food' },
  { id: 'pastry',          ar: 'حلواني',             fr: 'Pâtissier',                en: 'Pastry Chef',          icon: 'Cake',        category: 'food' },
  { id: 'bakery',          ar: 'فرّان (خبّاز)',       fr: 'Boulanger',                en: 'Baker',                icon: 'Wheat',       category: 'food' },
  { id: 'photography',     ar: 'مصوّر',              fr: 'Photographe',              en: 'Photographer',         icon: 'Camera',      category: 'services' },
  { id: 'graphic-design',  ar: 'مصمّم غرافيك',       fr: 'Graphiste',                en: 'Graphic Designer',     icon: 'Palette',     category: 'tech' },
  { id: 'phone-repair',    ar: 'مصلّح تيليفونات',    fr: 'Réparateur de téléphones', en: 'Phone Repair',         icon: 'Smartphone',  category: 'tech' },
  { id: 'gardening',       ar: 'بستاني (جارديني)',   fr: 'Jardinier',                en: 'Gardener',             icon: 'Leaf',        category: 'services' },
  { id: 'interior-design', ar: 'ديكور داخلي',        fr: 'Décorateur intérieur',     en: 'Interior Designer',    icon: 'Sofa',        category: 'services' },
  { id: 'driving',         ar: 'سائق (شوفور)',       fr: 'Chauffeur',                en: 'Driver',               icon: 'Truck',       category: 'services' },
  { id: 'tutoring',        ar: 'أستاذ خصوصي',        fr: 'Cours particuliers',       en: 'Private Tutor',        icon: 'BookOpen',    category: 'other' },
  { id: 'yard-work',       ar: 'معلّم ياردات',       fr: 'Travaux de cour',          en: 'Yard Work',            icon: 'Shovel',      category: 'services' },
  { id: 'childcare',       ar: 'مربّية أطفال',       fr: "Garde d'enfants",          en: 'Childcare',            icon: 'Baby',        category: 'other' },
] as const;

// ── Cities (comprehensive — major Moroccan urban centers) ────────────────────
// Existing ids preserved; en labels and many new cities added.
export const CITIES: readonly LocalizedCity[] = [
  { id: 'casablanca',   ar: 'الدار البيضاء', fr: 'Casablanca',   en: 'Casablanca',   region: 'Casablanca-Settat' },
  { id: 'rabat',        ar: 'الرباط',        fr: 'Rabat',        en: 'Rabat',        region: 'Rabat-Salé-Kénitra' },
  { id: 'marrakech',    ar: 'مراكش',         fr: 'Marrakech',    en: 'Marrakesh',    region: 'Marrakech-Safi' },
  { id: 'fes',          ar: 'فاس',           fr: 'Fès',          en: 'Fez',          region: 'Fès-Meknès' },
  { id: 'tanger',       ar: 'طنجة',          fr: 'Tanger',       en: 'Tangier',      region: 'Tanger-Tétouan-Al Hoceïma' },
  { id: 'meknes',       ar: 'مكناس',         fr: 'Meknès',       en: 'Meknes',       region: 'Fès-Meknès' },
  { id: 'agadir',       ar: 'أكادير',        fr: 'Agadir',       en: 'Agadir',       region: 'Souss-Massa' },
  { id: 'oujda',        ar: 'وجدة',          fr: 'Oujda',        en: 'Oujda',        region: 'Oriental' },
  { id: 'kenitra',      ar: 'القنيطرة',      fr: 'Kénitra',      en: 'Kenitra',      region: 'Rabat-Salé-Kénitra' },
  { id: 'tetouan',      ar: 'تطوان',         fr: 'Tétouan',      en: 'Tetouan',      region: 'Tanger-Tétouan-Al Hoceïma' },
  { id: 'sale',         ar: 'سلا',           fr: 'Salé',         en: 'Sale',         region: 'Rabat-Salé-Kénitra' },
  { id: 'temara',       ar: 'تمارة',         fr: 'Témara',       en: 'Temara',       region: 'Rabat-Salé-Kénitra' },
  { id: 'mohammedia',   ar: 'المحمدية',      fr: 'Mohammedia',   en: 'Mohammedia',   region: 'Casablanca-Settat' },
  { id: 'safi',         ar: 'آسفي',          fr: 'Safi',         en: 'Safi',         region: 'Marrakech-Safi' },
  { id: 'el-jadida',    ar: 'الجديدة',       fr: 'El Jadida',    en: 'El Jadida',    region: 'Casablanca-Settat' },
  { id: 'nador',        ar: 'الناظور',       fr: 'Nador',        en: 'Nador',        region: 'Oriental' },
  { id: 'settat',       ar: 'سطات',          fr: 'Settat',       en: 'Settat',       region: 'Casablanca-Settat' },
  { id: 'berrechid',    ar: 'برشيد',         fr: 'Berrechid',    en: 'Berrechid',    region: 'Casablanca-Settat' },
  { id: 'khouribga',    ar: 'خريبكة',        fr: 'Khouribga',    en: 'Khouribga',    region: 'Béni Mellal-Khénifra' },
  { id: 'beni-mellal',  ar: 'بني ملال',      fr: 'Beni Mellal',  en: 'Beni Mellal',  region: 'Béni Mellal-Khénifra' },
  { id: 'khenifra',     ar: 'خنيفرة',        fr: 'Khénifra',     en: 'Khenifra',     region: 'Béni Mellal-Khénifra' },
  { id: 'fquih-ben-salah', ar: 'الفقيه بن صالح', fr: 'Fquih Ben Salah', en: 'Fquih Ben Salah', region: 'Béni Mellal-Khénifra' },
  { id: 'larache',      ar: 'العرائش',       fr: 'Larache',      en: 'Larache',      region: 'Tanger-Tétouan-Al Hoceïma' },
  { id: 'ksar-el-kebir', ar: 'القصر الكبير', fr: 'Ksar El Kébir', en: 'Ksar El Kebir', region: 'Tanger-Tétouan-Al Hoceïma' },
  { id: 'al-hoceima',   ar: 'الحسيمة',       fr: 'Al Hoceïma',   en: 'Al Hoceima',   region: 'Tanger-Tétouan-Al Hoceïma' },
  { id: 'chefchaouen',  ar: 'شفشاون',        fr: 'Chefchaouen',  en: 'Chefchaouen',  region: 'Tanger-Tétouan-Al Hoceïma' },
  { id: 'asilah',       ar: 'أصيلة',         fr: 'Asilah',       en: 'Asilah',       region: 'Tanger-Tétouan-Al Hoceïma' },
  { id: 'martil',       ar: 'مرتيل',         fr: 'Martil',       en: 'Martil',       region: 'Tanger-Tétouan-Al Hoceïma' },
  { id: 'khemisset',    ar: 'الخميسات',      fr: 'Khémisset',    en: 'Khemisset',    region: 'Rabat-Salé-Kénitra' },
  { id: 'sidi-kacem',   ar: 'سيدي قاسم',     fr: 'Sidi Kacem',   en: 'Sidi Kacem',   region: 'Rabat-Salé-Kénitra' },
  { id: 'sidi-slimane', ar: 'سيدي سليمان',   fr: 'Sidi Slimane', en: 'Sidi Slimane', region: 'Rabat-Salé-Kénitra' },
  { id: 'taza',         ar: 'تازة',          fr: 'Taza',         en: 'Taza',         region: 'Fès-Meknès' },
  { id: 'sefrou',       ar: 'صفرو',          fr: 'Sefrou',       en: 'Sefrou',       region: 'Fès-Meknès' },
  { id: 'ifrane',       ar: 'إفران',         fr: 'Ifrane',       en: 'Ifrane',       region: 'Fès-Meknès' },
  { id: 'azrou',        ar: 'أزرو',          fr: 'Azrou',        en: 'Azrou',        region: 'Fès-Meknès' },
  { id: 'berkane',      ar: 'بركان',         fr: 'Berkane',      en: 'Berkane',      region: 'Oriental' },
  { id: 'taourirt',     ar: 'تاوريرت',       fr: 'Taourirt',     en: 'Taourirt',     region: 'Oriental' },
  { id: 'guercif',      ar: 'جرسيف',         fr: 'Guercif',      en: 'Guercif',      region: 'Oriental' },
  { id: 'jerada',       ar: 'جرادة',         fr: 'Jerada',       en: 'Jerada',       region: 'Oriental' },
  { id: 'essaouira',    ar: 'الصويرة',       fr: 'Essaouira',    en: 'Essaouira',    region: 'Marrakech-Safi' },
  { id: 'youssoufia',   ar: 'اليوسفية',      fr: 'Youssoufia',   en: 'Youssoufia',   region: 'Marrakech-Safi' },
  { id: 'taroudant',    ar: 'تارودانت',      fr: 'Taroudant',    en: 'Taroudant',    region: 'Souss-Massa' },
  { id: 'tiznit',       ar: 'تزنيت',         fr: 'Tiznit',       en: 'Tiznit',       region: 'Souss-Massa' },
  { id: 'ouarzazate',   ar: 'ورزازات',       fr: 'Ouarzazate',   en: 'Ouarzazate',   region: 'Drâa-Tafilalet' },
  { id: 'errachidia',   ar: 'الرشيدية',      fr: 'Errachidia',   en: 'Errachidia',   region: 'Drâa-Tafilalet' },
  { id: 'tinghir',      ar: 'تنغير',         fr: 'Tinghir',      en: 'Tinghir',      region: 'Drâa-Tafilalet' },
  { id: 'midelt',       ar: 'ميدلت',         fr: 'Midelt',       en: 'Midelt',       region: 'Drâa-Tafilalet' },
  { id: 'guelmim',      ar: 'كلميم',         fr: 'Guelmim',      en: 'Guelmim',      region: 'Guelmim-Oued Noun' },
  { id: 'tan-tan',      ar: 'طانطان',        fr: 'Tan-Tan',      en: 'Tan-Tan',      region: 'Guelmim-Oued Noun' },
  { id: 'laayoune',     ar: 'العيون',        fr: 'Laâyoune',     en: 'Laayoune',     region: 'Laâyoune-Sakia El Hamra' },
  { id: 'smara',        ar: 'السمارة',       fr: 'Smara',        en: 'Smara',        region: 'Laâyoune-Sakia El Hamra' },
  { id: 'dakhla',       ar: 'الداخلة',       fr: 'Dakhla',       en: 'Dakhla',       region: 'Dakhla-Oued Ed-Dahab' },
] as const;
