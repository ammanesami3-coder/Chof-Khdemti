'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, LayoutList } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SharedPostEmbed } from './shared-post-embed';
import { sharePostToProfile } from '@/lib/actions/shares';
import type { PostWithAuthor } from '@/lib/validations/post';

type Props = {
  post: PostWithAuthor;
  onBack: () => void;
  onClose: () => void;
};

export function ShareToProfileSheet({ post, onBack, onClose }: Props) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sharedData = post.shared_post ?? {
    id: post.id,
    content: post.content,
    media: post.media,
    created_at: post.created_at,
    author: post.author,
  };

  async function handleShare() {
    setLoading(true);
    const result = await sharePostToProfile({
      postId: post.shared_post_id ?? post.id,
      comment: comment.trim() || undefined,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('تمت مشاركة المنشور على ملفك الشخصي');
    onClose();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {/* Sub-header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="rounded-full p-2 transition-colors hover:bg-muted text-muted-foreground"
          aria-label="رجوع"
        >
          <ArrowRight className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
            <LayoutList className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">مشاركة على ملفك الشخصي</p>
            <p className="text-xs text-muted-foreground">سيظهر في الفيد الخاص بك</p>
          </div>
        </div>
      </div>

      {/* Comment input */}
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="أضف تعليقاً... (اختياري)"
        className="min-h-[80px] resize-none text-sm"
        maxLength={500}
        dir="rtl"
      />

      {/* Original post preview */}
      <SharedPostEmbed post={sharedData} />

      {/* Share button */}
      <Button onClick={handleShare} disabled={loading} className="w-full gap-2">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <LayoutList className="size-4" />}
        {loading ? 'جاري المشاركة...' : 'مشاركة على ملفي'}
      </Button>
    </div>
  );
}
