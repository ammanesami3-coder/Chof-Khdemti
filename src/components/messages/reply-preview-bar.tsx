'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';

type ReplyTarget = {
  id:          string;
  content:     string | null;
  senderName:  string;
  messageType: string;
};

type Props = {
  replyingTo: ReplyTarget;
  onCancel:   () => void;
};

export function ReplyPreviewBar({ replyingTo, onCancel }: Props) {
  const { t } = useLang();

  const preview = replyingTo.content
    ? replyingTo.content.slice(0, 80) + (replyingTo.content.length > 80 ? '…' : '')
    : replyingTo.messageType === 'voice'
    ? `🎤 ${t('voiceMessageLabel')}`
    : `📎 ${t('attachmentLabel')}`;

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-t bg-muted/40 px-4 py-2',
        'animate-in slide-in-from-bottom-1 duration-150',
      )}
    >
      {/* Colored accent */}
      <div className="w-0.5 self-stretch rounded-full bg-primary" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-primary">{replyingTo.senderName}</p>
        <p className="truncate text-xs text-muted-foreground">{preview}</p>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onCancel}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={t('cancelReplyAriaLabel')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
