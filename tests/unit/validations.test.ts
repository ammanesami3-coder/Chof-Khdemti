import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { postSchema, ratingSchema as _ratingSchema } from '@/lib/validations/post';
import { ratingSchema } from '@/lib/validations/rating';
import { signUpSchema } from '@/lib/validations/auth';

// ── Profile bio (inline schema matching profile.ts updateProfileSchema) ────────
const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100),
  bio: z.string().max(300).optional(),
});

describe('Zod validations', () => {
  // ── Profile ─────────────────────────────────────────────────────────────────
  describe('profile update schema', () => {
    it('accepts a valid bio', () => {
      const result = profileUpdateSchema.safeParse({
        full_name: 'أحمد',
        bio: 'حرفي محترف في النجارة',
      });
      expect(result.success).toBe(true);
    });

    it('rejects bio > 300 chars', () => {
      const result = profileUpdateSchema.safeParse({
        full_name: 'أحمد',
        bio: 'a'.repeat(301),
      });
      expect(result.success).toBe(false);
    });

    it('accepts bio of exactly 300 chars', () => {
      const result = profileUpdateSchema.safeParse({
        full_name: 'أحمد',
        bio: 'a'.repeat(300),
      });
      expect(result.success).toBe(true);
    });
  });

  // ── Post ────────────────────────────────────────────────────────────────────
  describe('postSchema', () => {
    it('accepts valid post with content only', () => {
      const result = postSchema.safeParse({ content: 'منشور جديد', media: [] });
      expect(result.success).toBe(true);
    });

    it('rejects content > 2000 chars', () => {
      const result = postSchema.safeParse({
        content: 'a'.repeat(2001),
        media: [],
      });
      expect(result.success).toBe(false);
    });

    it('accepts content of exactly 2000 chars', () => {
      const result = postSchema.safeParse({
        content: 'a'.repeat(2000),
        media: [],
      });
      expect(result.success).toBe(true);
    });

    it('rejects post with no content and no media', () => {
      const result = postSchema.safeParse({ content: '', media: [] });
      expect(result.success).toBe(false);
    });

    it('accepts post with media and no content', () => {
      const result = postSchema.safeParse({
        media: [
          {
            type: 'image',
            url: 'https://example.com/img.jpg',
            thumbnail: 'https://example.com/thumb.jpg',
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  // ── Rating ──────────────────────────────────────────────────────────────────
  describe('ratingSchema', () => {
    const validBase = {
      artisanId: '550e8400-e29b-41d4-a716-446655440000',
      stars: 3,
    };

    it('accepts stars from 1 to 5', () => {
      for (const stars of [1, 2, 3, 4, 5]) {
        expect(ratingSchema.safeParse({ ...validBase, stars }).success).toBe(true);
      }
    });

    it('rejects stars = 0', () => {
      expect(ratingSchema.safeParse({ ...validBase, stars: 0 }).success).toBe(false);
    });

    it('rejects stars = 6', () => {
      expect(ratingSchema.safeParse({ ...validBase, stars: 6 }).success).toBe(false);
    });

    it('rejects comment > 500 chars', () => {
      const result = ratingSchema.safeParse({
        ...validBase,
        comment: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('accepts comment of exactly 500 chars', () => {
      const result = ratingSchema.safeParse({
        ...validBase,
        comment: 'a'.repeat(500),
      });
      expect(result.success).toBe(true);
    });

    it('accepts missing comment (optional)', () => {
      expect(ratingSchema.safeParse(validBase).success).toBe(true);
    });
  });

  // ── Username ─────────────────────────────────────────────────────────────────
  describe('signUpSchema username', () => {
    const baseUser = {
      full_name: 'اسم المستخدم',
      email: 'test@example.com',
      password: 'password123',
      account_type: 'customer' as const,
    };

    it('accepts lowercase alphanumeric with underscore', () => {
      expect(
        signUpSchema.safeParse({ ...baseUser, username: 'user_name123' }).success,
      ).toBe(true);
    });

    it('rejects uppercase letters', () => {
      expect(
        signUpSchema.safeParse({ ...baseUser, username: 'UserName' }).success,
      ).toBe(false);
    });

    it('rejects spaces', () => {
      expect(
        signUpSchema.safeParse({ ...baseUser, username: 'user name' }).success,
      ).toBe(false);
    });

    it('rejects Arabic characters', () => {
      expect(
        signUpSchema.safeParse({ ...baseUser, username: 'مستخدم' }).success,
      ).toBe(false);
    });

    it('rejects username shorter than 3 chars', () => {
      expect(
        signUpSchema.safeParse({ ...baseUser, username: 'ab' }).success,
      ).toBe(false);
    });

    it('rejects username longer than 30 chars', () => {
      expect(
        signUpSchema.safeParse({ ...baseUser, username: 'a'.repeat(31) }).success,
      ).toBe(false);
    });
  });
});
