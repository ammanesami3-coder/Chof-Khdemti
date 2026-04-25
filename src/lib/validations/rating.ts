import { z } from 'zod';

export const ratingSchema = z.object({
  artisanId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export type RatingInput = z.infer<typeof ratingSchema>;

export type Rating = {
  id: string;
  artisan_id: string;
  customer_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};
