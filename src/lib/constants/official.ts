// ── Official platform account ───────────────────────────────────────────────
// Identifies the single official "Chof Khdemti" system/admin account whose
// posts and stories are injected globally (see feed-list + status actions).
//
// Identification is client-safe (username + an optional public UUID); it never
// relies on a secret. The canonical server-side resolver lives in
// src/lib/official/account.ts.

/** The reserved username/tag for the official platform account. */
export const OFFICIAL_USERNAME = 'ChofKhdemti';

/**
 * Optional explicit UUID of the official account. When set it takes priority
 * over the username match (handy if the account is ever renamed). Public on
 * purpose — it's only an id, not a credential.
 */
export const OFFICIAL_ACCOUNT_ID =
  process.env.NEXT_PUBLIC_OFFICIAL_ACCOUNT_ID ?? '';

/** How many of the official account's most-recent posts to pin at the top. */
export const OFFICIAL_PINNED_LIMIT = 3;

type OfficialCandidate = {
  id?: string | null;
  username?: string | null;
  role?: string | null;
};

/**
 * Is this user the official platform account?
 * Matches on the configured UUID first, then on the reserved username
 * (case-insensitive). Safe to call on the client.
 */
export function isOfficialAccount(user: OfficialCandidate | null | undefined): boolean {
  if (!user) return false;
  if (OFFICIAL_ACCOUNT_ID && user.id && user.id === OFFICIAL_ACCOUNT_ID) return true;
  if (user.username && user.username.toLowerCase() === OFFICIAL_USERNAME.toLowerCase()) {
    return true;
  }
  return false;
}
