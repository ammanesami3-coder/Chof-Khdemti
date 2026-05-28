export type CraftCategory = 'construction' | 'services' | 'food' | 'beauty' | 'tech' | 'other';

export type Craft = {
  id: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  icon: string;
  category: CraftCategory;
};

export const CRAFTS: Craft[] = [
  { id: 'carpentry',       name_ar: 'نجارة',           name_fr: 'Menuiserie',             name_en: 'Carpentry',         icon: 'Hammer',    category: 'construction' },
  { id: 'plumbing',        name_ar: 'سباكة',           name_fr: 'Plomberie',              name_en: 'Plumbing',          icon: 'Wrench',    category: 'construction' },
  { id: 'electricity',     name_ar: 'كهرباء',          name_fr: 'Électricité',            name_en: 'Electrical',        icon: 'Zap',       category: 'construction' },
  { id: 'painting',        name_ar: 'دهان',            name_fr: 'Peinture',               name_en: 'Painting',          icon: 'PaintBucket', category: 'construction' },
  { id: 'tiling',          name_ar: 'بلاطة',           name_fr: 'Carrelage',              name_en: 'Tiling',            icon: 'Grid3x3',   category: 'construction' },
  { id: 'mechanic',        name_ar: 'ميكانيكي سيارات', name_fr: 'Mécanicien auto',        name_en: 'Car Mechanic',      icon: 'Car',       category: 'services' },
  { id: 'tailoring',       name_ar: 'خياط',            name_fr: 'Couture',                name_en: 'Tailoring',         icon: 'Scissors',  category: 'services' },
  { id: 'barber',          name_ar: 'حلاق رجالي',      name_fr: 'Coiffeur homme',         name_en: "Men's Barber",      icon: 'User',      category: 'beauty' },
  { id: 'hairdresser',     name_ar: 'حلاقة نساء',      name_fr: 'Coiffeuse femme',        name_en: "Women's Hairdresser", icon: 'Sparkles', category: 'beauty' },
  { id: 'cooking',         name_ar: 'طباخ',            name_fr: 'Cuisinier',              name_en: 'Cook / Chef',       icon: 'ChefHat',   category: 'food' },
  { id: 'photography',     name_ar: 'مصور',            name_fr: 'Photographe',            name_en: 'Photography',       icon: 'Camera',    category: 'services' },
  { id: 'graphic-design',  name_ar: 'مصمم غرافيك',     name_fr: 'Graphiste',              name_en: 'Graphic Design',    icon: 'Palette',   category: 'tech' },
  { id: 'ac-repair',       name_ar: 'مُكيفات',         name_fr: 'Climatisation',          name_en: 'AC Repair',         icon: 'Wind',      category: 'construction' },
  { id: 'construction',    name_ar: 'بناء',            name_fr: 'Maçonnerie',             name_en: 'Construction',      icon: 'Building2', category: 'construction' },
  { id: 'phone-repair',    name_ar: 'مصلح هواتف',      name_fr: 'Réparation téléphones',  name_en: 'Phone Repair',      icon: 'Smartphone', category: 'tech' },
  { id: 'gardening',       name_ar: 'بستاني',          name_fr: 'Jardinage',              name_en: 'Gardening',         icon: 'Leaf',      category: 'services' },
  { id: 'interior-design', name_ar: 'ديكور داخلي',     name_fr: 'Décoration intérieure',  name_en: 'Interior Design',   icon: 'Sofa',      category: 'services' },
  { id: 'driving',         name_ar: 'سائق',            name_fr: 'Chauffeur',              name_en: 'Driver',            icon: 'Truck',     category: 'services' },
  { id: 'tutoring',        name_ar: 'مُدرّس خصوصي',    name_fr: 'Cours particuliers',     name_en: 'Private Tutoring',  icon: 'BookOpen',  category: 'other' },
  { id: 'yard-work',       name_ar: 'معلّم ياردات',    name_fr: 'Travaux de cour',        name_en: 'Yard Work',         icon: 'Shovel',    category: 'services' },
  { id: 'pastry',          name_ar: 'حلواني',          name_fr: 'Pâtissier',              name_en: 'Pastry Chef',       icon: 'Cake',      category: 'food' },
  { id: 'bakery',          name_ar: 'خبّاز',           name_fr: 'Boulanger',              name_en: 'Baker',             icon: 'Wheat',     category: 'food' },
  { id: 'skincare',        name_ar: 'عناية بالبشرة',   name_fr: 'Soins de la peau',       name_en: 'Skincare',          icon: 'Heart',     category: 'beauty' },
  { id: 'childcare',       name_ar: 'مربية أطفال',     name_fr: "Garde d'enfants",        name_en: 'Childcare',         icon: 'Baby',      category: 'other' },
];

export function getCraftById(id: string): Craft | null {
  return CRAFTS.find((c) => c.id === id) ?? null;
}

/** Returns the craft name in the requested language, searching by id OR Arabic name. */
export function getCraftName(idOrArabicName: string, lang: 'ar' | 'fr' | 'en'): string {
  const craft = CRAFTS.find((c) => c.id === idOrArabicName) ?? CRAFTS.find((c) => c.name_ar === idOrArabicName);
  if (!craft) return idOrArabicName;
  if (lang === 'fr') return craft.name_fr;
  if (lang === 'en') return craft.name_en;
  return craft.name_ar;
}
