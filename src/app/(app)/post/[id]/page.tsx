import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchPostById } from '@/lib/queries/posts';
import { PostCard } from '@/components/feed/post-card';
import { BackButton } from './back-button';

export const metadata = { title: 'منشور — Chof Khdemti' };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comment?: string }>;
};

export default async function PostPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const highlightCommentId = sp.comment;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUserId: string | undefined;
  let currentUser:
    | {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
      }
    | undefined;

  if (user) {
    const [userRes, profileRes] = await Promise.all([
      supabase
        .from('users')
        .select('username, full_name')
        .eq('id', user.id)
        .single(),
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single(),
    ]);
    if (userRes.data) {
      currentUserId = user.id;
      currentUser = {
        id: user.id,
        username: userRes.data.username,
        full_name: userRes.data.full_name,
        avatar_url: profileRes.data?.avatar_url ?? null,
      };
    }
  }

  const post = await fetchPostById(id, currentUserId);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6" dir="rtl">
      <div className="mb-4">
        <BackButton />
      </div>
      <PostCard
        post={post}
        currentUserId={currentUserId}
        currentUser={currentUser}
        priority
        initialCommentHighlight={highlightCommentId}
      />
    </main>
  );
}
