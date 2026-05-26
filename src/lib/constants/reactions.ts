export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export type Reaction = {
  type: ReactionType;
  emoji: string;
  label_ar: string;
  label_fr: string;
  label_en: string;
  activeColor: string;
  activeHoverBg: string;
};

export const REACTIONS: Reaction[] = [
  {
    type: 'like',
    emoji: '👍',
    label_ar: 'إعجاب',
    label_fr: "J'aime",
    label_en: 'Like',
    activeColor: 'text-blue-500',
    activeHoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950',
  },
  {
    type: 'love',
    emoji: '❤️',
    label_ar: 'أحب',
    label_fr: 'J\'adore',
    label_en: 'Love',
    activeColor: 'text-red-500',
    activeHoverBg: 'hover:bg-red-50 dark:hover:bg-red-950',
  },
  {
    type: 'haha',
    emoji: '😂',
    label_ar: 'هاها',
    label_fr: 'Haha',
    label_en: 'Haha',
    activeColor: 'text-yellow-500',
    activeHoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-950',
  },
  {
    type: 'wow',
    emoji: '😮',
    label_ar: 'واو',
    label_fr: 'Wouah',
    label_en: 'Wow',
    activeColor: 'text-yellow-500',
    activeHoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-950',
  },
  {
    type: 'sad',
    emoji: '😢',
    label_ar: 'حزين',
    label_fr: 'Triste',
    label_en: 'Sad',
    activeColor: 'text-yellow-500',
    activeHoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-950',
  },
  {
    type: 'angry',
    emoji: '😡',
    label_ar: 'غاضب',
    label_fr: 'Grrr',
    label_en: 'Angry',
    activeColor: 'text-orange-500',
    activeHoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-950',
  },
];

export function getReaction(type: string | null | undefined): Reaction | null {
  if (!type) return null;
  return REACTIONS.find((r) => r.type === type) ?? null;
}

/** Returns top N reaction types sorted by count, e.g. [love, haha, like] */
export function getTopReactions(
  summary: Record<string, number> | null | undefined,
  limit = 3,
): Reaction[] {
  if (!summary) return [];
  return Object.entries(summary)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([type]) => getReaction(type))
    .filter(Boolean) as Reaction[];
}
