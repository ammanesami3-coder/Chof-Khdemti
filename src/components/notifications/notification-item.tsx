'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Heart, MessageCircle, Reply, UserPlus, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/hooks/use-notifications';

type Props = {
  notification: NotificationItem;
  onRead: (id: string) => void;
  onClose: () => void;
};

const TYPE_CONFIG = {
  like: {
    text: 'أعجب بمنشورك',
    icon: Heart,
    iconClass: 'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400',
  },
  comment: {
    text: 'علّق على منشورك',
    icon: MessageCircle,
    iconClass: 'bg-blue-100 text-blue-500 dark:bg-blue-900/40 dark:text-blue-400',
  },
  comment_reply: {
    text: 'ردّ على تعليقك',
    icon: Reply,
    iconClass: 'bg-purple-100 text-purple-500 dark:bg-purple-900/40 dark:text-purple-400',
  },
  comment_like: {
    text: 'أعجب بتعليقك',
    icon: ThumbsUp,
    iconClass: 'bg-orange-100 text-orange-500 dark:bg-orange-900/40 dark:text-orange-400',
  },
  follow: {
    text: 'بدأ متابعتك',
    icon: UserPlus,
    iconClass: 'bg-green-100 text-green-500 dark:bg-green-900/40 dark:text-green-400',
  },
} as const;

function getDestination(n: NotificationItem): string {
  if (n.type === 'follow') return `/profile/${n.actor.username}`;
  if (n.post_id) return `/post/${n.post_id}`;
  return `/profile/${n.actor.username}`;
}

const initials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function NotificationItemCard({ notification: n, onRead, onClose }: Props) {
  const config = TYPE_CONFIG[n.type];
  const Icon = config.icon;
  const href = getDestination(n);

  const timeAgo = formatDistanceToNow(new Date(n.created_at), {
    addSuffix: true,
    locale: ar,
  });

  function handleClick() {
    if (!n.is_read) onRead(n.id);
    onClose();
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60',
        !n.is_read && 'bg-blue-50/60 dark:bg-blue-950/30',
      )}
    >
      {/* Avatar + action icon badge */}
      <div className="relative shrink-0">
        <div className="size-11 overflow-hidden rounded-full bg-muted">
          {n.actor.avatar_url ? (
            <Image
              src={n.actor.avatar_url}
              alt={n.actor.full_name}
              width={44}
              height={44}
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-red-500 to-green-600 text-xs font-bold text-white">
              {initials(n.actor.full_name)}
            </div>
          )}
        </div>
        {/* Action type badge */}
        <span
          className={cn(
            'absolute -bottom-0.5 -end-0.5 flex size-5 items-center justify-center rounded-full shadow-sm',
            config.iconClass,
          )}
        >
          <Icon className="size-2.5" />
        </span>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground">
          <span className="font-semibold">{n.actor.full_name}</span>
          {' '}
          <span className="text-foreground/80">{config.text}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo}</p>
      </div>

      {/* Post thumbnail */}
      {n.post_thumbnail && (
        <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={n.post_thumbnail}
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Unread dot */}
      {!n.is_read && (
        <span className="mt-2 size-2.5 shrink-0 rounded-full bg-blue-500" />
      )}
    </Link>
  );
}
