/** Returns the average rating as a one-decimal string. */
export function formatStars(avg: number): string {
  return avg.toFixed(1);
}

/**
 * Decomposes an average rating into full stars, half star, and empty stars.
 * A half star is shown when the fractional part is >= 0.5.
 */
export function formatStarsDisplay(avg: number): {
  full: number;
  half: boolean;
  empty: number;
} {
  const full = Math.floor(avg);
  const half = avg - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return { full, half, empty };
}
