'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, Tv2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sharePostToStory } from '@/lib/actions/shares';
import type { PostWithAuthor } from '@/lib/validations/post';
import { cn } from '@/lib/utils';

type Props = {
  post: PostWithAuthor;
  onBack: () => void;
  onClose: () => void;
};

const BG_OPTIONS = [
  { label: 'أزرق', value: '#1877F2' },
  { label: 'بنفسجي', value: 'linear-gradient(135deg,#9333ea,#ec4899)' },
  { label: 'أخضر', value: 'linear-gradient(135deg,#16a34a,#0891b2)' },
  { label: 'برتقالي', value: 'linear-gradient(135deg,#ea580c,#dc2626)' },
  { label: 'وردي', value: 'linear-gradient(135deg,#db2777,#9333ea)' },
  { label: 'داكن', value: 'linear-gradient(135deg,#1e293b,#0f172a)' },
];

export function ShareToStorySheet({ post, onBack, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedBg, setSelectedBg] = useState(BG_OPTIONS[0]!.value);

  const originalPost = post.shared_post ?? post;
  const firstImage = originalPost.media.find((m) => m.type === 'image');
  const hasMedia = !!firstImage;

  async function handleShare() {
    setLoading(true);
    const result = await sharePostToStory(post.shared_post_id ?? post.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Notify StatusBar to add the new status without a page reload
    if (result.status) {
      window.dispatchEvent(new CustomEvent('status:story-created', { detail: result.status }));
    }

    toast.success('تمت مشاركة المنشور في قصتك لمدة 24 ساعة');
    onClose();
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
          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <Tv2 className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">مشاركة في قصتي</p>
            <p className="text-xs text-muted-foreground">ستظهر لمتابعيك لمدة 24 ساعة</p>
          </div>
        </div>
      </div>

      {/* Story preview card */}
      <div className="relative mx-auto w-[160px] overflow-hidden rounded-2xl shadow-lg" style={{ height: 284 }}>
        {hasMedia ? (
          <Image src={firstImage.url} alt="" fill className="object-cover" sizes="160px" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: selectedBg }}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* Content preview */}
        <div className="absolute inset-x-3 bottom-4 space-y-1.5">
          {!hasMedia && originalPost.content && (
            <p className="line-clamp-4 text-center text-xs font-medium text-white leading-snug">
              {originalPost.content}
            </p>
          )}
          {/* "Shared post" label */}
          <div className="rounded-lg bg-white/20 backdrop-blur-sm px-2 py-1.5 text-center">
            <p className="text-[10px] font-semibold text-white/90">منشور مشارَك</p>
            <p className="text-[10px] text-white/70 truncate">{post.author.full_name}</p>
          </div>
        </div>
      </div>

      {/* Background picker (only for text-only posts) */}
      {!hasMedia && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">اختر لون الخلفية</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {BG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedBg(opt.value)}
                className={cn(
                  'size-9 shrink-0 rounded-full transition-transform hover:scale-110',
                  selectedBg === opt.value && 'ring-2 ring-primary ring-offset-2 scale-110'
                )}
                style={{ background: opt.value }}
                aria-label={opt.label}
              />
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <p className="text-center text-xs text-muted-foreground">
        سيمكن الضغط على قصتك للانتقال إلى المنشور الأصلي
      </p>

      {/* Share button */}
      <Button onClick={handleShare} disabled={loading} className="w-full gap-2">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Tv2 className="size-4" />}
        {loading ? 'جاري المشاركة...' : 'مشاركة في قصتي'}
      </Button>
    </div>
  );
}
