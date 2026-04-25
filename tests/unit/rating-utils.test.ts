import { describe, it, expect } from 'vitest';
import { formatStars, formatStarsDisplay } from '@/lib/rating/rating-utils';

describe('formatStars', () => {
  it('formats integer average with one decimal place', () => {
    expect(formatStars(4)).toBe('4.0');
  });

  it('formats 4.7 → "4.7"', () => {
    expect(formatStars(4.7)).toBe('4.7');
  });

  it('formats 3.67 → "3.7" (rounded)', () => {
    expect(formatStars(3.67)).toBe('3.7');
  });

  it('formats 5.0 → "5.0"', () => {
    expect(formatStars(5.0)).toBe('5.0');
  });

  it('formats 1.0 → "1.0"', () => {
    expect(formatStars(1.0)).toBe('1.0');
  });
});

describe('formatStarsDisplay', () => {
  it('4.3 → { full: 4, half: false, empty: 1 }', () => {
    expect(formatStarsDisplay(4.3)).toEqual({ full: 4, half: false, empty: 1 });
  });

  it('4.5 → { full: 4, half: true, empty: 0 }', () => {
    expect(formatStarsDisplay(4.5)).toEqual({ full: 4, half: true, empty: 0 });
  });

  it('4.7 → { full: 4, half: true, empty: 0 }', () => {
    expect(formatStarsDisplay(4.7)).toEqual({ full: 4, half: true, empty: 0 });
  });

  it('5.0 → { full: 5, half: false, empty: 0 }', () => {
    expect(formatStarsDisplay(5.0)).toEqual({ full: 5, half: false, empty: 0 });
  });

  it('1.0 → { full: 1, half: false, empty: 4 }', () => {
    expect(formatStarsDisplay(1.0)).toEqual({ full: 1, half: false, empty: 4 });
  });

  it('3.5 → { full: 3, half: true, empty: 1 }', () => {
    expect(formatStarsDisplay(3.5)).toEqual({ full: 3, half: true, empty: 1 });
  });

  it('total always equals 5', () => {
    const averages = [1.0, 1.5, 2.3, 3.7, 4.0, 4.5, 5.0];
    for (const avg of averages) {
      const { full, half, empty } = formatStarsDisplay(avg);
      expect(full + (half ? 1 : 0) + empty).toBe(5);
    }
  });
});
