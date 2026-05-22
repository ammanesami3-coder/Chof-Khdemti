import { createClient } from '@/lib/supabase/server';
import { fetchVideoFeed } from '@/lib/queries/posts';
import { VideoFeed } from '@/components/feed/video-feed';

export const metadata = {
  title: 'الفيديوهات — شوف خدمتي',
  description: 'شاهد فيديوهات أعمال الحرفيين المغاربة',
};

export default async function VideosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUser: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null = null;

  if (user) {
    const [userRes, profileRes] = await Promise.all([
      supabase.from('users').select('id, username, full_name').eq('id', user.id).single(),
      supabase.from('profiles').select('avatar_url').eq('user_id', user.id).single(),
    ]);
    if (userRes.data) {
      currentUser = {
        id: user.id,
        username: userRes.data.username as string,
        full_name: userRes.data.full_name as string,
        avatar_url: profileRes.data?.avatar_url ?? null,
      };
    }
  }

  const initialFeed = await fetchVideoFeed(currentUser?.id);

  return <VideoFeed currentUser={currentUser} initialFeed={initialFeed} />;
}
