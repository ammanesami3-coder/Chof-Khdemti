export type City = {
  id: string;
  name_ar: string;
  name_fr: string;
  region: string;
};

export const CITIES: City[] = [
  {
    id: 'casablanca',
    name_ar: 'الدار البيضاء',
    name_fr: 'Casablanca',
    region: 'Casablanca-Settat',
  },
  {
    id: 'rabat',
    name_ar: 'الرباط',
    name_fr: 'Rabat',
    region: 'Rabat-Salé-Kénitra',
  },
  {
    id: 'marrakech',
    name_ar: 'مراكش',
    name_fr: 'Marrakech',
    region: 'Marrakech-Safi',
  },
  {
    id: 'fes',
    name_ar: 'فاس',
    name_fr: 'Fès',
    region: 'Fès-Meknès',
  },
  {
    id: 'tanger',
    name_ar: 'طنجة',
    name_fr: 'Tanger',
    region: 'Tanger-Tétouan-Al Hoceïma',
  },
  {
    id: 'agadir',
    name_ar: 'أكادير',
    name_fr: 'Agadir',
    region: 'Souss-Massa',
  },
  {
    id: 'meknes',
    name_ar: 'مكناس',
    name_fr: 'Meknès',
    region: 'Fès-Meknès',
  },
  {
    id: 'oujda',
    name_ar: 'وجدة',
    name_fr: 'Oujda',
    region: 'Oriental',
  },
  {
    id: 'kenitra',
    name_ar: 'القنيطرة',
    name_fr: 'Kénitra',
    region: 'Rabat-Salé-Kénitra',
  },
  {
    id: 'tetouan',
    name_ar: 'تطوان',
    name_fr: 'Tétouan',
    region: 'Tanger-Tétouan-Al Hoceïma',
  },
  {
    id: 'sale',
    name_ar: 'سلا',
    name_fr: 'Salé',
    region: 'Rabat-Salé-Kénitra',
  },
  {
    id: 'temara',
    name_ar: 'تمارة',
    name_fr: 'Témara',
    region: 'Rabat-Salé-Kénitra',
  },
  {
    id: 'safi',
    name_ar: 'آسفي',
    name_fr: 'Safi',
    region: 'Marrakech-Safi',
  },
  {
    id: 'el-jadida',
    name_ar: 'الجديدة',
    name_fr: 'El Jadida',
    region: 'Casablanca-Settat',
  },
  {
    id: 'laayoune',
    name_ar: 'العيون',
    name_fr: 'Laâyoune',
    region: 'Laâyoune-Sakia El Hamra',
  },
  {
    id: 'essaouira',
    name_ar: 'الصويرة',
    name_fr: 'Essaouira',
    region: 'Marrakech-Safi',
  },
  {
    id: 'beni-mellal',
    name_ar: 'بني ملال',
    name_fr: 'Beni Mellal',
    region: 'Béni Mellal-Khénifra',
  },
  {
    id: 'nador',
    name_ar: 'الناظور',
    name_fr: 'Nador',
    region: 'Oriental',
  },
  {
    id: 'khouribga',
    name_ar: 'خريبكة',
    name_fr: 'Khouribga',
    region: 'Béni Mellal-Khénifra',
  },
  {
    id: 'ouarzazate',
    name_ar: 'ورززات',
    name_fr: 'Ouarzazate',
    region: 'Drâa-Tafilalet',
  },
  {
    id: 'settat',
    name_ar: 'سطات',
    name_fr: 'Settat',
    region: 'Casablanca-Settat',
  },
  {
    id: 'khenifra',
    name_ar: 'خنيفرة',
    name_fr: 'Khénifra',
    region: 'Béni Mellal-Khénifra',
  },
  {
    id: 'tan-tan',
    name_ar: 'طانطان',
    name_fr: 'Tan-Tan',
    region: 'Guelmim-Oued Noun',
  },
  {
    id: 'al-hoceima',
    name_ar: 'الحسيمة',
    name_fr: 'Al Hoceïma',
    region: 'Tanger-Tétouan-Al Hoceïma',
  },
];

export function getCityById(id: string): City | null {
  return CITIES.find((c) => c.id === id) ?? null;
}
