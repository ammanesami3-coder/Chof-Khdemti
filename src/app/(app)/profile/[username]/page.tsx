import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileClient } from '@/components/profile/profile-client';
import { FeedList } from '@/components/feed/feed-list';
import { RatingCard } from '@/components/rating/rating-card';
import { AddEditRating } from '@/components/rating/add-edit-rating';
import { createClient } from '@/lib/supabase/server';
import { fetchUserPosts } from '@/lib/queries/posts';
import type { Rating } from '@/lib/validations/rating';
import type { RatingCardData } from '@/components/rating/rating-card';

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
  const isArtisan = profileUser.account_type === 'artisan';

  // ── Parallel queries ────────────────────────────────────────────────────
  const [
    postsRes,
    followersRes,
    followingRes,
    ratingsListRes,
    ratingStatsRes,
    currentUserRes,
    isFollowingRes,
    initialPostsPage,
  ] = await Promise.all([
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
    // قائمة التقييمات مع بيانات الزبون — للحرفيين فقط
    isArtisan
      ? supabase
          .from('ratings')
          .select(
            `id, stars, comment, created_at, updated_at,
             customer:users!ratings_customer_id_fkey(
               username, full_name,
               profile:profiles(avatar_url)
             )`,
          )
          .eq('artisan_id', profileUser.id)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    // إحصائيات التقييم عبر RPC get_artisan_rating
    isArtisan
      ? supabase.rpc('get_artisan_rating', { p_artisan_id: profileUser.id })
      : Promise.resolve({ data: null }),
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

  const currentUser = currentUserRes.data
    ? { id: currentUserRes.data.id, account_type: currentUserRes.data.account_type }
    : null;

  const isCustomerProfile =
    !!currentUser && currentUser.account_type === 'customer' && !isOwnProfile;

  // ── تقييم المستخدم الحالي + صلاحية التقييم ─────────────────────────────
  const [myRatingRes, canRateRes] =
    isArtisan && isCustomerProfile
      ? await Promise.all([
          supabase
            .from('ratings')
            .select('id, artisan_id, customer_id, stars, comment, created_at, updated_at')
            .eq('artisan_id', profileUser.id)
            .eq('customer_id', currentUser.id)
            .maybeSingle(),
          supabase.rpc('can_customer_rate', {
            p_artisan_id: profileUser.id,
            p_customer_id: currentUser.id,
          }),
        ])
      : [{ data: null }, { data: false }];

  // ── إحصائيات التقييم من RPC ────────────────────────────────────────────
  const ratingStatsRow = Array.isArray(ratingStatsRes.data)
    ? ratingStatsRes.data[0]
    : ratingStatsRes.data;
  const avgRating =
    ratingStatsRow?.avg_stars != null ? Number(ratingStatsRow.avg_stars) : null;
  const totalRatingsCount: number = ratingStatsRow?.total_count ?? 0;

  // ── قائمة التقييمات ────────────────────────────────────────────────────
  const rawRatings = (ratingsListRes.data ?? []) as Array<{
    id: string;
    stars: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
    customer: {
      username: string;
      full_name: string;
      profile: { avatar_url: string | null } | { avatar_url: string | null }[] | null;
    } | null;
  }>;

  // ── Normalise ratings pour RatingCard ──────────────────────────────────
  const ratings: RatingCardData[] = rawRatings
    .filter((r) => r.customer !== null)
    .map((r) => {
      const profile = r.customer!.profile;
      const avatarUrl = Array.isArray(profile)
        ? (profile[0]?.avatar_url ?? null)
        : (profile?.avatar_url ?? null);
      return {
        id: r.id,
        stars: r.stars,
        comment: r.comment,
        created_at: r.created_at,
        updated_at: r.updated_at,
        customer: {
          username: r.customer!.username,
          full_name: r.customer!.full_name,
          avatar_url: avatarUrl,
        },
      };
    });

  const initialIsFollowing = (isFollowingRes.count ?? 0) > 0;
  const joinedAt = format(new Date(profileUser.created_at), 'MMMM yyyy', { locale: ar });

  return (
    <main className="mx-auto max-w-2xl">
      <ProfileClient
        user={profileUser}
        profile={profile}
        avgRating={avgRating}
        totalRatingsCount={totalRatingsCount}
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
          {isArtisan && totalRatingsCount >= 1 && (
            <TabsTrigger
              value="ratings"
              className="flex-1 rounded-none border-b-2 border-transparent py-3 data-active:border-primary data-active:shadow-none"
            >
              التقييمات
              <span className="ms-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {totalRatingsCount}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Posts */}
        <TabsContent value="posts" className="pt-4">
          <FeedList
            feedType="user"
            currentUserId={authUser?.id}
            profileUserId={profileUser.id}
            ownerName={profileUser.full_name}
            isOwnProfile={isOwnProfile}
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
        {isArtisan && totalRatingsCount >= 1 && (
          <TabsContent value="ratings" className="p-4 space-y-4">
            {/* زر إضافة / تعديل التقييم — للزبائن فقط */}
            {isCustomerProfile && (
              <AddEditRating
                artisanId={profileUser.id}
                initialRating={myRatingRes.data as Rating | null}
                canRate={!!(canRateRes.data)}
              />
            )}

            {/* قائمة التقييمات */}
            {ratings.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                لا يوجد تقييمات بعد — كن أول من يقيّم
              </p>
            ) : (
              <div>
                {ratings.map((r) => (
                  <RatingCard key={r.id} {...r} />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </main>
  );
}
