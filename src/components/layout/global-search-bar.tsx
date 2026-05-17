'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, User2, Loader2, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLang } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ArtisanResult = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  craft_category: string | null;
  city: string | null;
};

type PostResult = {
  id: string;
  content: string | null;
  author_username: string;
  author_name: string;
};

type Results = { artisans: ArtisanResult[]; posts: PostResult[] };

// ─── Search query ─────────────────────────────────────────────────────────────

async function runSearch(q: string): Promise<Results> {
  if (!q.trim()) return { artisans: [], posts: [] };
  const supabase = createClient();
  const term = q.trim();

  const [artisanRes, postRes] = await Promise.all([
    supabase
      .from('users')
      .select(
        'id, username, full_name, profiles(avatar_url, craft_category, city)',
      )
      .eq('account_type', 'artisan')
      .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
      .limit(5),

    supabase
      .from('posts')
      .select(
        'id, content, users!posts_author_id_fkey(username, full_name)',
      )
      .ilike('content', `%${term}%`)
      .not('content', 'is', null)
      .limit(3),
  ]);

  const artisans: ArtisanResult[] = ((artisanRes.data ?? []) as unknown as {
    id: string;
    username: string;
    full_name: string;
    profiles: { avatar_url: string | null; craft_category: string | null; city: string | null } | null;
  }[]).map((a) => ({
    id: a.id,
    username: a.username,
    full_name: a.full_name,
    avatar_url: a.profiles?.avatar_url ?? null,
    craft_category: a.profiles?.craft_category ?? null,
    city: a.profiles?.city ?? null,
  }));

  const posts: PostResult[] = ((postRes.data ?? []) as unknown as {
    id: string;
    content: string | null;
    users: { username: string; full_name: string } | null;
  }[]).map((p) => ({
    id: p.id,
    content: p.content,
    author_username: p.users?.username ?? '',
    author_name: p.users?.full_name ?? '',
  }));

  return { artisans, posts };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = { className?: string };

export function GlobalSearchBar({ className }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { t, dir } = useLang();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await runSearch(q);
      setResults(res);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) { setResults(null); setOpen(false); return; }
    timerRef.current = setTimeout(() => doSearch(val), 300);
  }

  function handleClear() {
    setQuery('');
    setResults(null);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleSubmit() {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  }

  const hasResults = results && (results.artisans.length > 0 || results.posts.length > 0);
  const isEmpty = results && results.artisans.length === 0 && results.posts.length === 0;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results) setOpen(true); }}
          placeholder={t('searchPlaceholder')}
          autoComplete="off"
          aria-label={t('search')}
          className={cn(
            'h-9 w-full rounded-full bg-muted/60 border border-transparent',
            'ps-9 pe-9 text-sm placeholder:text-muted-foreground',
            'outline-none ring-0 transition-all duration-200',
            'focus:bg-background focus:border-[#FF9F43]/50 focus:ring-2 focus:ring-[#FF9F43]/20',
          )}
          dir={dir}
        />
        {(loading || query) && (
          <span className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <button
                type="button"
                onClick={handleClear}
                aria-label={t('clearSearchAriaLabel')}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute top-full mt-2 w-full min-w-[280px] z-50',
            'rounded-xl border bg-popover shadow-xl overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 duration-150',
          )}
          dir={dir}
        >
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <Search className="h-5 w-5 opacity-40" />
              <p className="text-sm">{t('noResults')}</p>
            </div>
          )}

          {hasResults && (
            <>
              {/* Artisans section */}
              {results.artisans.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b bg-muted/40">
                    {t('artisans')}
                  </div>
                  {results.artisans.map((a) => (
                    <Link
                      key={a.id}
                      href={`/profile/${a.username}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors"
                    >
                      {a.avatar_url ? (
                        <Image
                          src={a.avatar_url}
                          alt={a.full_name}
                          width={36}
                          height={36}
                          className="rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{a.username}
                          {a.craft_category && ` · ${a.craft_category}`}
                          {a.city && ` · ${a.city}`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Posts section */}
              {results.posts.length > 0 && (
                <div className={results.artisans.length > 0 ? 'border-t' : ''}>
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b bg-muted/40">
                    {t('posts')}
                  </div>
                  {results.posts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/post/${p.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{p.author_name}</p>
                        <p className="text-sm line-clamp-2">{p.content}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* View all */}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-t text-sm text-primary hover:bg-muted/60 transition-colors font-medium"
              >
                <Search className="h-3.5 w-3.5" />
                {t('viewAll')} &ldquo;{query}&rdquo;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
