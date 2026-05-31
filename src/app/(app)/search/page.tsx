import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { User2, FileText, Search } from 'lucide-react';
import { SearchPageInput } from './search-input';
import { OfficialBadge } from '@/components/shared/official-badge';
import { isOfficialAccount } from '@/lib/constants/official';
import type { Metadata } from 'next';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `بحث: ${q} — Chof Khdemti` : 'بحث — Chof Khdemti' };
}

type RawProfile = {
  avatar_url: string | null;
  craft_category: string | null;
  city: string | null;
};
type RawArtisan = {
  id: string;
  username: string;
  full_name: string;
  profiles: RawProfile | null;
};
type RawPost = {
  id: string;
  author_id: string;
  content: string | null;
  created_at: string;
  users: {
    username: string;
    full_name: string;
    profiles: { avatar_url: string | null } | null;
  } | null;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = '' } = await searchParams;
  const term = q.trim();

  let artisans: RawArtisan[] = [];
  let posts: RawPost[] = [];

  if (term) {
    const supabase = await createClient();
    const [artisanRes, postRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, username, full_name, profiles(avatar_url, craft_category, city)')
        .eq('account_type', 'artisan')
        .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
        .limit(20),

      supabase
        .from('posts')
        .select(
          'id, author_id, content, created_at, users!posts_author_id_fkey(username, full_name, profiles(avatar_url))',
        )
        .ilike('content', `%${term}%`)
        .not('content', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    artisans = (artisanRes.data ?? []) as unknown as RawArtisan[];
    posts = (postRes.data ?? []) as unknown as RawPost[];

    // Drop results whose owner opted out of public visibility. Isolated query —
    // a missing column (migration 0040 not applied) degrades to showing all.
    const ids = [...artisans.map((a) => a.id), ...posts.map((p) => p.author_id)];
    if (ids.length) {
      const { data: visRows } = await supabase
        .from('profiles')
        .select('user_id, profile_visibility')
        .in('user_id', ids);
      if (visRows) {
        const hidden = new Set(
          visRows
            .filter((r) => ((r.profile_visibility as string | null) ?? 'everyone') !== 'everyone')
            .map((r) => r.user_id),
        );
        artisans = artisans.filter((a) => !hidden.has(a.id));
        posts = posts.filter((p) => !hidden.has(p.author_id));
      }
    }
  }

  const totalResults = artisans.length + posts.length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      {/* Search input (prominent on mobile, visible on all) */}
      <div className="mb-6">
        <SearchPageInput initialQuery={term} />
      </div>

      {/* No query state */}
      {!term && (
        <div className="flex flex-col items-center gap-4 text-muted-foreground py-12">
          <Search className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium text-center">ابحث عن حرفيين ومنشورات وخدمات</p>
          <p className="text-sm text-center">اكتب كلمة في شريط البحث أعلاه للبدء</p>
        </div>
      )}

      {/* Results header */}
      {term && (
        <div className="mb-5">
          <h1 className="text-lg font-bold">
            نتائج البحث عن &ldquo;{term}&rdquo;
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalResults === 0 ? 'لا توجد نتائج' : `${totalResults} نتيجة`}
          </p>
        </div>
      )}

      {/* No results */}
      {term && totalResults === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Search className="h-10 w-10 opacity-30" />
          <p className="font-medium">لا توجد نتائج لـ &ldquo;{term}&rdquo;</p>
          <p className="text-sm">جرّب كلمات مختلفة أو ابحث بمدينة أو تخصص</p>
          <Link
            href="/explore"
            className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            تصفح كل الحرفيين
          </Link>
        </div>
      )}

      {/* Artisans section */}
      {artisans.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <User2 className="h-3.5 w-3.5" />
            الحرفيون ({artisans.length})
          </h2>
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {artisans.map((a) => (
              <Link
                key={a.id}
                href={`/profile/${a.username}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                {a.profiles?.avatar_url ? (
                  <Image
                    src={a.profiles.avatar_url}
                    alt={a.full_name}
                    width={44}
                    height={44}
                    className="rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 font-medium">
                    <span className="truncate">{a.full_name}</span>
                    {isOfficialAccount({ id: a.id, username: a.username }) && (
                      <OfficialBadge size="xs" />
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{a.username}
                    {a.profiles?.craft_category && ` · ${a.profiles.craft_category}`}
                    {a.profiles?.city && ` · ${a.profiles.city}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Posts section */}
      {posts.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            المنشورات ({posts.length})
          </h2>
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/post/${p.id}`}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                {p.users?.profiles?.avatar_url ? (
                  <Image
                    src={p.users.profiles.avatar_url}
                    alt={p.users.full_name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="mt-0.5 h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-medium">
                    <span className="truncate">{p.users?.full_name ?? 'مجهول'}</span>
                    {isOfficialAccount({ id: p.author_id, username: p.users?.username }) && (
                      <OfficialBadge size="xs" />
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {p.content}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
