import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { UserAvatar } from '@/components/shared/user-avatar';
import { cn } from '@/lib/utils';
import type { ConversationRow } from '@/lib/queries/conversations';

type Props = {
  conv: ConversationRow;
  currentUserId: string;
};

function relativeTime(dateStr: string | null) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: ar });
  } catch {
    return '';
  }
}

export function ConversationListItem({ conv, currentUserId }: Props) {
  const {
    id,
    partner_full_name,
    partner_username,
    partner_avatar_url,
    last_message_content,
    last_message_created_at,
    last_message_sender_id,
    last_message_at,
    unread_count,
  } = conv;

  const isUnread = unread_count > 0;
  const isSentByMe = last_message_sender_id === currentUserId;
  const timeStr = relativeTime(last_message_created_at ?? last_message_at);

  return (
    <Link
      href={`/messages/${id}`}
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50',
        isUnread && 'bg-accent/20',
      )}
    >
      {/* Avatar — linkable=false لأن الـ item بأكمله Link */}
      <UserAvatar
        user={{ username: partner_username, full_name: partner_full_name, avatar_url: partner_avatar_url }}
        size="lg"
        linkable={false}
      />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Row 1: Name + Time */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'shrink-0 text-xs text-muted-foreground',
              isUnread && 'font-medium text-foreground',
            )}
          >
            {timeStr}
          </span>
          <span
            className={cn(
              'truncate text-sm',
              isUnread ? 'font-semibold' : 'font-medium',
            )}
          >
            {partner_full_name}
          </span>
        </div>

        {/* Row 2: Last message + Unread badge */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {isUnread ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread_count > 99 ? '99+' : unread_count}
            </span>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <p
            className={cn(
              'truncate text-sm',
              isUnread ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {last_message_content
              ? isSentByMe
                ? `أنت: ${last_message_content}`
                : last_message_content
              : `@${partner_username}`}
          </p>
        </div>
      </div>
    </Link>
  );
}
