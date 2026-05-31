import "server-only";
import { headers } from "next/headers";

// ── In-memory fixed-window rate limiter ───────────────────────────────────────
//
// Best-effort and PER-INSTANCE: on Vercel each serverless instance keeps its own
// counters, so this throttles spam / brute-force / cost-abuse without adding a
// Redis dependency — but it is not a strict global guarantee. When cross-instance
// precision is needed, swap the Map for Upstash Ratelimit (same call sites).

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

// Bound memory: drop expired buckets at most once per minute.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Allow up to `limit` hits per `windowMs` for a given `key`.
 * Returns `success: false` once the window's budget is exhausted.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Best-guess client IP from forwarding headers. Vercel always sets
 * `x-forwarded-for`; falls back to `x-real-ip`, then a constant so a missing
 * header degrades to a shared (stricter) bucket rather than failing open.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
