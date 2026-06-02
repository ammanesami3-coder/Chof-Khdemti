'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Logs the user out via a POST to /logout, then redirects to /login.
 *
 * Always use this (or `fetch('/logout', { method: 'POST' })`) instead of a
 * `<Link href="/logout">`: GET /logout is side-effect-free precisely because
 * Next.js prefetches link targets, which would otherwise destroy the session
 * unprompted. POST is never prefetched.
 */
export function LogoutButton({
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/logout', { method: 'POST', redirect: 'manual' });
    } catch {
      // Network hiccup: still send the user to /login; the next protected
      // navigation re-validates the session through the middleware.
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}
