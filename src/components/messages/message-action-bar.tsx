'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CornerUpLeft, Smile, MoreHorizontal, Copy, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmojiPicker } from './emoji-picker';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';

type Props = {
  messageId:             string;
  isSent:                boolean;
  content:               string | null;
  canDeleteForEveryone:  boolean;
  currentEmoji:          string | null;
  onReact:               (emoji: string) => void;
  onReply:               () => void;
  onCopy:                () => void;
  onDeleteForMe:         () => void;
  onDeleteForEveryone:   () => void;
};

const BTN = cn(
  'flex h-7 w-7 items-center justify-center rounded-full',
  'bg-background border shadow-sm text-muted-foreground',
  'transition-colors hover:bg-accent hover:text-foreground',
);

export function MessageActionBar({
  isSent,
  content,
  canDeleteForEveryone,
  currentEmoji,
  onReact,
  onReply,
  onCopy,
  onDeleteForMe,
  onDeleteForEveryone,
}: Props) {
  const { t } = useLang();
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

  const handleEmojiClick = useCallback(() => {
    if (!emojiOpen && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      const PICKER_HEIGHT = 56;
      // EmojiPicker is 6×32px buttons + gaps/padding/border ≈ 216px wide.
      const PICKER_WIDTH = 220;
      const GAP = 8;
      const style: React.CSSProperties = { position: 'fixed', zIndex: 9999 };

      if (rect.top < PICKER_HEIGHT + 8) {
        style.top = rect.bottom + 4;
      } else {
        style.bottom = window.innerHeight - rect.top + 4;
      }

      // Align to the button's side, then clamp inside the viewport so the
      // picker — and its first emoji — is never clipped at a screen edge.
      const desiredLeft = isSent ? rect.right - PICKER_WIDTH : rect.left;
      style.left = Math.max(
        GAP,
        Math.min(desiredLeft, window.innerWidth - PICKER_WIDTH - GAP),
      );

      setPickerStyle(style);
    }
    setEmojiOpen((v) => !v);
  }, [emojiOpen, isSent]);

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        isSent ? 'flex-row-reverse' : 'flex-row',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Emoji trigger */}
      <button
        ref={emojiButtonRef}
        type="button"
        className={cn(BTN, emojiOpen && 'bg-accent text-foreground')}
        onClick={handleEmojiClick}
        aria-label={t('reactAriaLabel')}
      >
        <Smile className="h-3.5 w-3.5" />
      </button>

      {/* Emoji picker — rendered in portal to avoid overflow clipping */}
      {emojiOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setEmojiOpen(false)}
          />
          <div style={pickerStyle}>
            <EmojiPicker
              currentEmoji={currentEmoji}
              onSelect={(emoji) => {
                onReact(emoji);
                setEmojiOpen(false);
              }}
            />
          </div>
        </>,
        document.body,
      )}

      {/* Reply */}
      <button
        type="button"
        className={BTN}
        onClick={onReply}
        aria-label={t('replyAriaLabel')}
      >
        <CornerUpLeft className="h-3.5 w-3.5" />
      </button>

      {/* More */}
      <DropdownMenu>
        <DropdownMenuTrigger className={BTN} aria-label={t('moreOptionsAriaLabel')}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isSent ? 'end' : 'start'} className="min-w-[160px]">
          {content && (
            <DropdownMenuItem onClick={onCopy}>
              <Copy className="me-2 h-4 w-4" />
              {t('copyText')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDeleteForMe}
          >
            <Trash2 className="me-2 h-4 w-4" />
            {t('deleteForMeLabel')}
          </DropdownMenuItem>
          {canDeleteForEveryone && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDeleteForEveryone}
            >
              <Trash2 className="me-2 h-4 w-4" />
              {t('deleteForEveryoneLabel')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
