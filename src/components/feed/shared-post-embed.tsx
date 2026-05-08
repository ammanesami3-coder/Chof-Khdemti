'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, FileText, ImageIcon, Video } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { cn } from '@/lib/utils';
import type { SharedPostData } from '@/lib/validations/post';

type Props = {
  post: SharedPostData;
  className?: string;
  /** Show full content or truncated (used in PostCard vs. story viewer) */
  compact?: boolean;
};

export function SharedPostEmbed({ post, className, compact = false }: Props) {
  const firstImage = post.media.find((m) => m.type === 'image');
  const firstVideo = post.media.find((m) => m.type === 'video');
  const hasMedia = post.media.length > 0;

  return (
    <Link
      href={`/post/${post.id}`}
      className={cn(
        'block overflow-hidden rounded-xl border border-border/60 bg-muted/30',
        'transition-colors hover:bg-muted/60 active:bg-muted/80',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Media preview */}
      {firstImage && (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={firstImage.url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 672px) calc(100vw - 64px), 576px"
          />
          {post.media.length > 1 && (
            <span className="absolute end-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
              +{post.media.length - 1}
            </span>
          )}
        </div>
      )}
      {!firstImage && firstVideo && (
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {firstVideo.thumbnail ? (
            <Image src={firstVideo.thumbnail} alt="" fill className="object-cover opacity-80" sizes="576px" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Video className="size-10 text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-black/50 text-white">
              <Video className="size-5" />
            </div>
          </div>
        </div>
      )}
      {!hasMedia && post.content && !compact && (
        <div className="flex min-h-[80px] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4 dark:from-slate-800 dark:to-slate-900">
          <p className="line-clamp-3 text-center text-sm text-foreground/80">{post.content}</p>
        </div>
      )}

      {/* Author + content */}
      <div className="flex items-start gap-2.5 p-3">
        <UserAvatar user={post.author} size="xs" linkable={false} className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-xs font-semibold text-foreground">
              {post.author.full_name}
            </span>
            {post.author.is_verified && (
              <BadgeCheck className="size-3 shrink-0 fill-green-600 text-white" />
            )}
          </div>
          {post.content ? (
            <p className={cn('mt-0.5 text-xs text-muted-foreground leading-relaxed', compact ? 'line-clamp-1' : 'line-clamp-2')}>
              {post.content}
            </p>
          ) : hasMedia ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              {firstVideo ? <Video className="size-3" /> : <ImageIcon className="size-3" />}
              {post.media.length > 1 ? `${post.media.length} وسائط` : firstVideo ? 'فيديو' : 'صورة'}
            </p>
          ) : (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="size-3" />
              منشور
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
