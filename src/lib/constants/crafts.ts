export type CraftCategory = 'construction' | 'services' | 'food' | 'beauty' | 'tech' | 'other';

export type Craft = {
  id: string;
  name_ar: string;
  name_fr: string;
  icon: string;
  category: CraftCategory;
};

export const CRAFTS: Craft[] = [
  {
    id: 'carpentry',
    name_ar: 'نجارة',
    name_fr: 'Menuiserie',
    icon: 'Hammer',
    category: 'construction',
  },
  {
    id: 'plumbing',
    name_ar: 'سباكة',
    name_fr: 'Plomberie',
    icon: 'Wrench',
    category: 'construction',
  },
  {
    id: 'electricity',
    name_ar: 'كهرباء',
    name_fr: 'Électricité',
    icon: 'Zap',
    category: 'construction',
  },
  {
    id: 'painting',
    name_ar: 'دهان',
    name_fr: 'Peinture',
    icon: 'PaintBucket',
    category: 'construction',
  },
  {
    id: 'tiling',
    name_ar: 'بلاطة',
    name_fr: 'Carrelage',
    icon: 'Grid3x3',
    category: 'construction',
  },
  {
    id: 'mechanic',
    name_ar: 'ميكانيكي سيارات',
    name_fr: 'Mécanicien auto',
    icon: 'Car',
    category: 'services',
  },
  {
    id: 'tailoring',
    name_ar: 'خياط',
    name_fr: 'Couture',
    icon: 'Scissors',
    category: 'services',
  },
  {
    id: 'barber',
    name_ar: 'حلاق رجالي',
    name_fr: 'Coiffeur homme',
    icon: 'User',
    category: 'beauty',
  },
  {
    id: 'hairdresser',
    name_ar: 'حلاقة نساء',
    name_fr: 'Coiffeuse femme',
    icon: 'Sparkles',
    category: 'beauty',
  },
  {
    id: 'cooking',
    name_ar: 'طباخ',
    name_fr: 'Cuisinier',
    icon: 'ChefHat',
    category: 'food',
  },
  {
    id: 'photography',
    name_ar: 'مصور',
    name_fr: 'Photographe',
    icon: 'Camera',
    category: 'services',
  },
  {
    id: 'graphic-design',
    name_ar: 'مصمم غرافيك',
    name_fr: 'Graphiste',
    icon: 'Palette',
    category: 'tech',
  },
  {
    id: 'ac-repair',
    name_ar: 'مُكيفات',
    name_fr: 'Climatisation',
    icon: 'Wind',
    category: 'construction',
  },
  {
    id: 'construction',
    name_ar: 'بناء',
    name_fr: 'Maçonnerie',
    icon: 'Building2',
    category: 'construction',
  },
  {
    id: 'phone-repair',
    name_ar: 'مصلح هواتف',
    name_fr: 'Réparation téléphones',
    icon: 'Smartphone',
    category: 'tech',
  },
  {
    id: 'gardening',
    name_ar: 'بستاني',
    name_fr: 'Jardinage',
    icon: 'Leaf',
    category: 'services',
  },
  {
    id: 'interior-design',
    name_ar: 'ديكور داخلي',
    name_fr: 'Décoration intérieure',
    icon: 'Sofa',
    category: 'services',
  },
  {
    id: 'driving',
    name_ar: 'سائق',
    name_fr: 'Chauffeur',
    icon: 'Truck',
    category: 'services',
  },
  {
    id: 'tutoring',
    name_ar: 'مُدرّس خصوصي',
    name_fr: 'Cours particuliers',
    icon: 'BookOpen',
    category: 'other',
  },
  {
    id: 'yard-work',
    name_ar: 'معلّم ياردات',
    name_fr: 'Travaux de cour',
    icon: 'Shovel',
    category: 'services',
  },
  {
    id: 'pastry',
    name_ar: 'حلواني',
    name_fr: 'Pâtissier',
    icon: 'Cake',
    category: 'food',
  },
  {
    id: 'bakery',
    name_ar: 'خبّاز',
    name_fr: 'Boulanger',
    icon: 'Wheat',
    category: 'food',
  },
  {
    id: 'skincare',
    name_ar: 'عناية بالبشرة',
    name_fr: 'Soins de la peau',
    icon: 'Heart',
    category: 'beauty',
  },
  {
    id: 'childcare',
    name_ar: 'مربية أطفال',
    name_fr: 'Garde d\'enfants',
    icon: 'Baby',
    category: 'other',
  },
];

export function getCraftById(id: string): Craft | null {
  return CRAFTS.find((c) => c.id === id) ?? null;
}
