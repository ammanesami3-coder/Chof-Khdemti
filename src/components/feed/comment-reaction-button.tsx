'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getReaction } from '@/lib/constants/reactions';
import { ReactionPicker } from './reaction-picker';
import { useToggleCommentLike } from '@/hooks/use-comments';
import { useLang } from '@/lib/i18n/language-context';


interface CommentReactionButtonProps {
  commentId: string;
  postId: string;
  parentCommentId?: string | null;
  userReaction?: string | null;
  isLiked?: boolean;
  isAuthenticated?: boolean;
  /** Whether the parent comment itself is still being submitted (optimistic) */
  isPending?: boolean;
  className?: string;
}

const HOVER_DELAY_MS = 400;
const HOVER_CLOSE_MS = 300;
const LONGPRESS_MS   = 500;

export function CommentReactionButton({
  commentId,
  postId,
  parentCommentId,
  userReaction,
  isLiked,
  isAuthenticated = false,
  isPending = false,
  className,
}: CommentReactionButtonProps) {
  const { t, dir } = useLang();
  const toggleLikeMutation = useToggleCommentLike();

  const [pickerVisible, setPickerVisible] = useState(false);
  const hoverOpenTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef     = useRef(false);

  const showPicker = useCallback(() => {
    if (!isAuthenticated) return;
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    setPickerVisible(true);
  }, [isAuthenticated]);

  const hidePicker = useCallback(() => setPickerVisible(false), []);

  const scheduleHide = useCallback(() => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = setTimeout(hidePicker, HOVER_CLOSE_MS);
  }, [hidePicker]);

  const cancelHide = useCallback(() => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
  }, []);

  // ── Desktop hover (mouse only — ignore synthetic touch mouse events) ──────

  const handlePointerEnterButton = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (!isAuthenticated) return;
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

  // ── Mobile long-press (touch/pen only — mouse uses hover) ─────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    if (!isAuthenticated) return;
    longPressedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      showPicker();
    }, LONGPRESS_MS);
  };

  const handlePointerUp     = () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };
  const handlePointerCancel = () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };

  // ── Click: toggle current or default 'like' ──────────────────────────────

  const handleClick = () => {
    if (longPressedRef.current) { longPressedRef.current = false; return; }
    if (!isAuthenticated) return;
    hidePicker();
    toggleLikeMutation.mutate({ commentId, postId, parentCommentId, reaction: userReaction ?? 'like' });
  };

  // ── Reaction selected from picker ────────────────────────────────────────

  const handleReact = (reactionType: string) => {
    hidePicker();
    toggleLikeMutation.mutate({ commentId, postId, parentCommentId, reaction: reactionType });
  };

  const reactionDef = getReaction(userReaction);

  return (
    <div className={cn('relative', className)}>
      <ReactionPicker
        visible={pickerVisible}
        activeReaction={userReaction}
        onReact={handleReact}
        onMouseEnter={handlePickerMouseEnter}
        onMouseLeave={handlePickerMouseLeave}
        contextDir={dir}
      />

      <button
        type="button"
        onClick={handleClick}
        onPointerEnter={handlePointerEnterButton}
        onPointerLeave={handlePointerLeaveButton}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        disabled={isPending || toggleLikeMutation.isPending}
        aria-label={isLiked ? (reactionDef?.label_ar ?? t('commentLiked')) : t('commentLike')}
        className={cn(
          'inline-flex items-center text-[12px] font-semibold transition-colors select-none',
          'leading-none',
          isLiked
            ? (reactionDef?.activeColor ?? 'text-blue-600 dark:text-blue-400')
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {/* When reacted: show only the reaction emoji (no text). When not: show "Like" label. */}
        {isLiked
          ? <span className="text-[15px] leading-none">{reactionDef?.emoji ?? '👍'}</span>
          : t('commentLike')}
      </button>
    </div>
  );
}
