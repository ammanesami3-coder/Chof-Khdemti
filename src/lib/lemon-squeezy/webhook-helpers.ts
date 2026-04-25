import crypto from 'crypto';

/** Verifies Lemon Squeezy HMAC-SHA256 webhook signature. */
export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(body).digest('hex');
  const digestBuf = Buffer.from(digest, 'utf8');
  const sigBuf = Buffer.from(signature, 'utf8');
  if (digestBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(digestBuf, sigBuf);
}

/** Maps a Lemon Squeezy subscription status string to our DB enum value. */
export function mapLemonStatusToDb(
  lsStatus: string,
): 'active' | 'past_due' | 'cancelled' | null {
  switch (lsStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    default:
      return null;
  }
}

/** Computes the HMAC-SHA256 hex digest for a given body + secret (for tests). */
export function signBody(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}
