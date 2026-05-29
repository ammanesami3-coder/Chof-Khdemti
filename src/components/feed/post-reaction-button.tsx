'use client';

import { useCallback, useRef, useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReaction } from '@/lib/constants/reactions';
import { ReactionPicker } from './reaction-picker';
import { useLikePost } from '@/hooks/use-like-post';
import { useLang } from '@/lib/i18n/language-context';

interface PostReactionButtonProps {
  postId: string;
  likesCount: number;
  userReaction?: string | null;
  onPickerOpen?: () => void;
}

const HOVER_DELAY_MS   = 400;
const HOVER_CLOSE_MS   = 300;
const LONGPRESS_MS     = 500;

export function PostReactionButton({
  postId,
  likesCount,
  userReaction,
  onPickerOpen,
}: PostReactionButtonProps) {
  const { t } = useLang();
  const { mutate: react } = useLikePost();

  const [pickerVisible, setPickerVisible] = useState(false);
  const hoverOpenTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef     = useRef(false);

  const showPicker = useCallback(() => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    setPickerVisible(true);
    onPickerOpen?.();
  }, [onPickerOpen]);

  const hidePicker = useCallback(() => setPickerVisible(false), []);

  const scheduleHide = useCallback(() => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = setTimeout(hidePicker, HOVER_CLOSE_MS);
  }, [hidePicker]);

  const cancelHide = useCallback(() => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
  }, []);

  // ── Desktop hover (mouse only — ignore synthetic touch mouse events) ────────

  const handlePointerEnterButton = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    cancelHide();
    if (hoverOpenTimerRef.current) clearTimeout(hoverOpenTimerRef.current);
    hoverOpenTimerRef.current = setTimeout(showPicker, HOVER_DELAY_MS);
  };

  const handlePointerLeaveButton = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (hoverOpenTimerRef.current) clearTimeout(hoverOpenTimerRef.current);
    scheduleHide();
  };

  const handlePickerMouseEnter = () => cancelHide();
  const handlePickerMouseLeave = () => scheduleHide();

  // ── Mobile long-press (touch/pen only — mouse uses hover) ───────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    longPressedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      showPicker();
    }, LONGPRESS_MS);
  };

  const handlePointerUp     = () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };
  const handlePointerCancel = () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };

  // ── Click: toggle current or default 'like' ────────────────────────────────

  const handleClick = () => {
    if (longPressedRef.current) { longPressedRef.current = false; return; }
    hidePicker();
    react({ postId, reaction: userReaction ?? 'like' });
  };

  // ── Reaction selected from picker ──────────────────────────────────────────

  const handleReact = (reactionType: string) => {
    hidePicker();
    react({ postId, reaction: reactionType });
  };

  // ── Derived display ────────────────────────────────────────────────────────

  const active          = userReaction != null;
  const currentReaction = active ? getReaction(userReaction) : null;

  return (
    <div className="relative">
      <ReactionPicker
        visible={pickerVisible}
        activeReaction={userReaction}
        onReact={handleReact}
        onMouseEnter={handlePickerMouseEnter}
        onMouseLeave={handlePickerMouseLeave}
        contextDir="rtl"
      />

      <button
        onClick={handleClick}
        onPointerEnter={handlePointerEnterButton}
        onPointerLeave={handlePointerLeaveButton}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label={active ? (currentReaction?.label_ar ?? t('likeAriaLabel')) : t('likeAriaLabel')}
        aria-pressed={active}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
          'transition-colors duration-150 select-none',
          'hover:bg-muted',
          active
            ? (currentReaction?.activeColor ?? 'text-blue-500')
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {/* Icon: reaction emoji when active, thumb-up outline when not */}
        {active ? (
          <span className="text-[20px] leading-none">{currentReaction?.emoji ?? '👍'}</span>
        ) : (
          <ThumbsUp className="size-5" strokeWidth={1.75} />
        )}

        {/* Count only — NO reaction label text */}
        {likesCount > 0 && (
          <span className="tabular-nums">{likesCount}</span>
        )}
      </button>
    </div>
  );
}
