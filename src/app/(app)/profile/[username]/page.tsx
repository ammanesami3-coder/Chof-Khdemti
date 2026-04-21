import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileClient } from '@/components/profile/profile-client';
import { FeedList } from '@/components/feed/feed-list';
import { createClient } from '@/lib/supabase/server';
import { fetchUserPosts } from '@/lib/queries/posts';

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return { title: `@${username} — Chof Khdemti` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  // ── Auth user (optional — page is public) ──────────────────────────────
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // ── Profile owner ───────────────────────────────────────────────────────
  const { data: profileUser } = await supabase
    .from('users')
    .select('id, username, full_name, account_type, created_at')
    .eq('username', username)
    .single();

  if (!profileUser) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('bio, avatar_url, cover_url, craft_category, city, years_experience, is_verified')
    .eq('user_id', profileUser.id)
    .single();

  if (!profile) notFound();

  const isOwnProfile = authUser?.id === profileUser.id;

  // ── Parallel queries ────────────────────────────────────────────────────
  const [postsRes, followersRes, followingRes, ratingsRes, currentUserRes, isFollowingRes, initialPostsPage] =
    await Promise.all([
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', profileUser.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileUser.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileUser.id),
      profileUser.account_type === 'artisan'
        ? supabase.from('ratings').select('stars').eq('artisan_id', profileUser.id)
        : Promise.resolve({ data: [] as { stars: number }[] }),
      authUser
        ? supabase
            .from('users')
            .select('id, account_type')
            .eq('id', authUser.id)
            .single()
        : Promise.resolve({ data: null }),
      authUser && !isOwnProfile
        ? supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', authUser.id)
            .eq('following_id', profileUser.id)
        : Promise.resolve({ count: 0 }),
      fetchUserPosts(profileUser.id, authUser?.id),
    ]);

  const stars = ratingsRes.data ?? [];
  const avgRating =
    stars.length > 0
      ? Math.round((stars.reduce((s, r) => s + r.stars, 0) / stars.length) * 10) / 10
      : null;

  const currentUser = currentUserRes.data
    ? { id: currentUserRes.data.id, account_type: currentUserRes.data.account_type }
    : null;

  const initialIsFollowing = (isFollowingRes.count ?? 0) > 0;

  const joinedAt = format(new Date(profileUser.created_at), 'MMMM yyyy', { locale: ar });

  const isArtisan = profileUser.account_type === 'artisan';

  return (
    <main className="mx-auto max-w-2xl">
      <ProfileClient
        user={profileUser}
        profile={profile}
        avgRating={avgRating}
        currentUser={currentUser}
        initialIsFollowing={initialIsFollowing}
        postsCount={postsRes.count ?? 0}
        initialFollowersCount={followersRes.count ?? 0}
        followingCount={followingRes.count ?? 0}
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="posts" className="mt-2">
        <TabsList className="w-full rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="posts"
            className="flex-1 rounded-none border-b-2 border-transparent py-3 data-active:border-primary data-active:shadow-none"
          >
            الأعمال
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="flex-1 rounded-none border-b-2 border-transparent py-3 data-active:border-primary data-active:shadow-none"
          >
            عن
          </TabsTrigger>
          {isArtisan && (
            <TabsTrigger
              value="ratings"
              className="flex-1 rounded-none border-b-2 border-transparent py-3 data-active:border-primary data-active:shadow-none"
            >
              التقييمات
            </TabsTrigger>
          )}
        </TabsList>

        {/* Posts */}
        <TabsContent value="posts" className="pt-4">
          <FeedList
            feedType="user"
            currentUserId={authUser?.id}
            profileUserId={profileUser.id}
            initialData={initialPostsPage}
          />
        </TabsContent>

        {/* About */}
        <TabsContent value="about" className="p-4 space-y-4">
          {profile.bio && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted-foreground">نبذة</h3>
              <p className="text-sm leading-relaxed">{profile.bio}</p>
            </div>
          )}
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">عضو منذ</h3>
            <p className="text-sm">{joinedAt}</p>
          </div>
          {profile.years_experience != null && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted-foreground">سنوات الخبرة</h3>
              <p className="text-sm">{profile.years_experience} سنة</p>
            </div>
          )}
        </TabsContent>

        {/* Ratings */}
        {isArtisan && (
          <TabsContent value="ratings" className="p-4">
            <p className="text-center text-sm text-muted-foreground py-8">
              التقييمات ستظهر في المرحلة 5
            </p>
          </TabsContent>
        )}
      </Tabs>
    </main>
  );
}
