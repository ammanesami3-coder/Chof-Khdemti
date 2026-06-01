'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { X, Trash2, Eye, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  viewStatus,
  toggleStatusLike,
  replyToStatus,
  deleteStatus,
  getStatusViewers,
} from '@/lib/actions/status';
import type { StatusGroup, StatusWithUser } from '@/lib/types/status.types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLang } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const REACTIONS = [
  { emoji: '👍', key: 'like' },
  { emoji: '❤️', key: 'love' },
  { emoji: '😂', key: 'haha' },
  { emoji: '😮', key: 'wow' },
  { emoji: '😢', key: 'sad' },
  { emoji: '😡', key: 'angry' },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: StatusGroup[];
  initialGroupIdx: number;
  currentUserId: string;
  onViewed: (statusId: string) => void;
  onDeleted: (statusId: string) => void;
};

type Viewer = {
  username: string;
  full_name: string;
  avatar_url: string | null;
  reaction: string | null;
};

// ── Main Component ─────────────────────────────────────────────────────────────

export function StatusViewer({
  open,
  onOpenChange,
  groups,
  initialGroupIdx,
  currentUserId,
  onViewed,
  onDeleted,
}: Props) {
  const { t } = useLang();

  // ── SSR guard ──────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Animation state ────────────────────────────────────────────────────────
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      clearTimeout(closeTimerRef.current);
      setShouldRender(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsVisible(true))
      );
    } else {
      setIsVisible(false);
      closeTimerRef.current = setTimeout(() => setShouldRender(false), 280);
    }
    return () => clearTimeout(closeTimerRef.current);
  }, [open]);

  // ── Body scroll lock ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldRender) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [shouldRender]);

  // ── Story state ────────────────────────────────────────────────────────────
  const [groupIdx, setGroupIdx] = useState(initialGroupIdx);
  const [storyIdx, setStoryIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isReplyFocused, setIsReplyFocused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [localReaction, setLocalReaction] = useState<string | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressActiveRef = useRef(false);

  // Swipe-to-dismiss state
  const touchRef = useRef({ startX: 0, startY: 0, moved: false, isVertical: false });

  // ── Derived ────────────────────────────────────────────────────────────────
  const group = groups[groupIdx] as StatusGroup | undefined;
  const story = group?.statuses[storyIdx] as StatusWithUser | undefined;
  const isOwn = story?.user_id === currentUserId;
  const durationMs = (story?.duration ?? 5) * 1000;
  const progressKey = `${groupIdx}-${storyIdx}`;

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setGroupIdx(initialGroupIdx);
      setStoryIdx(0);
      setPaused(false);
      setIsReplyFocused(false);
      setShowReactions(false);
      setShowViewers(false);
      setReplyText('');
    }
  }, [open, initialGroupIdx]);

  // ── Per-story reset ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!story) return;
    setLocalReaction(story.my_reaction);
    setShowReactions(false);
    setShowViewers(false);
    setReplyText('');
    setIsReplyFocused(false);
    setPaused(false);

    if (!story.viewed) {
      viewStatus(story.id)
        .then(() => onViewed(story.id))
        .catch(() => {});
    }
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Advance ────────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.statuses.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
    } else {
      onOpenChange(false);
    }
  }, [group, storyIdx, groupIdx, groups.length, onOpenChange]);

  // ── Auto-advance timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || paused || isReplyFocused || !story || showViewers) return;
    storyTimerRef.current = setTimeout(advance, durationMs);
    return () => {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    };
  }, [open, paused, isReplyFocused, story?.id, advance, showViewers, durationMs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Video play/pause sync ──────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (paused || isReplyFocused || showViewers) {
      vid.pause();
    } else {
      vid.play().catch(() => {});
    }
  }, [paused, isReplyFocused, showViewers]);

  // Reset video when navigating to a different story
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = 0;
    if (!paused) vid.play().catch(() => {});
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ─────────────────────────────────────────────────────────────
  function goPrev() {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx((g) => g - 1);
      setStoryIdx((prevGroup?.statuses.length ?? 1) - 1);
    }
  }

  function goNext() {
    advance();
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onOpenChange(false); return; }
      if (e.key === 'ArrowRight') goPrev();
      if (e.key === 'ArrowLeft') goNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, groupIdx, storyIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Long-press pause ───────────────────────────────────────────────────────
  function startPressTimer() {
    longPressActiveRef.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      longPressActiveRef.current = true;
      setPaused(true);
    }, 200);
  }

  function clearPressTimer() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    longPressActiveRef.current = false;
    setPaused(false);
  }

  // ── Swipe-to-dismiss (touch) ───────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]!;
    touchRef.current = { startX: t.clientX, startY: t.clientY, moved: false, isVertical: false };
    startPressTimer();
  }

  function onTouchMove(e: React.TouchEvent) {
    const t = e.touches[0]!;
    const dx = t.clientX - touchRef.current.startX;
    const dy = t.clientY - touchRef.current.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!touchRef.current.moved && dist > 10) {
      touchRef.current.moved = true;
      touchRef.current.isVertical = Math.abs(dy) > Math.abs(dx);
      // Cancel the press timer on movement, but only if long press hasn't activated yet.
      // If longPressActiveRef is true, keep paused so the user can hold and pan without unpausing.
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    }

    if (!touchRef.current.isVertical || dy <= 0) return;

    // Vertical swipe down → dismiss
    setPaused(true);
    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(${dy}px)`;
      containerRef.current.style.opacity = `${Math.max(0.2, 1 - dy / 280)}`;
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const t = e.changedTouches[0]!;
    const dy = t.clientY - touchRef.current.startY;

    clearPressTimer();

    if (!touchRef.current.isVertical || dy <= 0) {
      // Regular tap or upward swipe — restore and resume
      resetContainerTransform(true);
      return;
    }

    const cont = containerRef.current;
    if (!cont) return;

    if (dy > 100) {
      // Dismiss
      cont.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
      cont.style.transform = 'translateY(100%)';
      cont.style.opacity = '0';
      setTimeout(() => onOpenChange(false), 220);
    } else {
      // Snap back
      resetContainerTransform(true);
    }
  }

  function resetContainerTransform(resume = false) {
    const cont = containerRef.current;
    if (!cont) return;
    cont.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
    cont.style.transform = '';
    cont.style.opacity = '';
    setTimeout(() => {
      if (cont) cont.style.transition = '';
      if (resume) setPaused(false);
    }, 250);
  }

  // ── Reactions ──────────────────────────────────────────────────────────────
  async function handleReact(key: string) {
    if (!story) return;
    setShowReactions(false);
    const prev = localReaction;
    setLocalReaction(prev === key ? null : key);
    const result = await toggleStatusLike(story.id, key);
    if (result.error) {
      setLocalReaction(prev);
      toast.error(result.error);
    }
  }

  // ── Reply ──────────────────────────────────────────────────────────────────
  async function handleReply() {
    if (!story || !replyText.trim()) return;
    setIsSending(true);
    const result = await replyToStatus(story.id, replyText.trim());
    setIsSending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('replySent'));
      setReplyText('');
      setIsReplyFocused(false);
      setPaused(false);
    }
  }

  // ── Viewers ────────────────────────────────────────────────────────────────
  async function handleToggleViewers() {
    if (!story) return;
    if (!showViewers) {
      const data = await getStatusViewers(story.id);
      setViewers(data);
    }
    setShowViewers((v) => !v);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!story) return;
    const result = await deleteStatus(story.id);
    if (result.error) { toast.error(result.error); return; }
    onDeleted(story.id);
    toast.success(t('statusDeleted'));
    if (storyIdx < (group?.statuses.length ?? 0) - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
    } else {
      onOpenChange(false);
    }
  }

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!mounted || !shouldRender || !group || !story) return null;

  const timeAgo = formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: ar });
  const reactionEmoji = REACTIONS.find((r) => r.key === localReaction)?.emoji;
  const isSuspended = paused || isReplyFocused || showViewers;

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[200] flex items-center justify-center">

      {/* ── Backdrop ────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'absolute inset-0 bg-black',
          'transition-opacity duration-280',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={() => !showViewers && onOpenChange(false)}
      />

      {/* ── Desktop: prev-group arrow (RTL: right side = previous) ─────────── */}
      {groupIdx > 0 && (
        <button
          type="button"
          onClick={goPrev}
          aria-label={t('prevGroupAriaLabel')}
          className={cn(
            'absolute right-4 top-1/2 z-30 -translate-y-1/2',
            'hidden sm:flex size-11 items-center justify-center',
            'rounded-full bg-white/20 text-white backdrop-blur-sm',
            'hover:bg-white/35 transition-colors',
            'transition-opacity duration-280',
            isVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          <ChevronRight className="size-6" />
        </button>
      )}

      {/* ── Desktop: next-group arrow (RTL: left side = next) ──────────────── */}
      {groupIdx < groups.length - 1 && (
        <button
          type="button"
          onClick={goNext}
          aria-label={t('nextGroupAriaLabel')}
          className={cn(
            'absolute left-4 top-1/2 z-30 -translate-y-1/2',
            'hidden sm:flex size-11 items-center justify-center',
            'rounded-full bg-white/20 text-white backdrop-blur-sm',
            'hover:bg-white/35 transition-colors',
            'transition-opacity duration-280',
            isVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          <ChevronLeft className="size-6" />
        </button>
      )}

      {/* ── Story container ─────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${t('storyAriaLabel')} ${story.user.full_name}`}
        className={cn(
          'relative w-full h-full overflow-hidden bg-black',
          'sm:w-[430px] sm:h-[92dvh] sm:rounded-2xl sm:shadow-2xl',
          'transition-opacity duration-280',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      >

        {/* ── Progress bars ────────────────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 top-0 z-20 flex gap-[3px] px-2"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 10px), 10px)' }}
        >
          {group.statuses.map((s, i) => (
            <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              {i < storyIdx ? (
                <div className="h-full w-full bg-white rounded-full" />
              ) : i === storyIdx ? (
                <div
                  key={progressKey}
                  className="h-full w-full rounded-full bg-white origin-left"
                  style={{
                    animation: `statusProgress ${durationMs}ms linear forwards`,
                    animationPlayState: isSuspended ? 'paused' : 'running',
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 z-20 flex items-center gap-2.5 px-3 py-2"
          style={{ top: 'max(env(safe-area-inset-top, 10px) + 16px, 26px)' }}
        >
          {/* Avatar → profile */}
          <Link
            href={`/profile/${story.user.username}`}
            onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
            className="shrink-0 rounded-full ring-[2px] ring-white/60 shadow-md transition-transform hover:scale-105"
            aria-label={story.user.full_name}
          >
            <UserAvatar user={story.user} size="sm" linkable={false} />
          </Link>

          {/* Name + time */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${story.user.username}`}
              onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
              className="inline-block max-w-full truncate text-[13.5px] font-semibold text-white leading-tight drop-shadow-sm transition-opacity hover:opacity-80"
            >
              {story.user.full_name}
            </Link>
            <p className="text-[11px] text-white/70 leading-tight mt-0.5">{timeAgo}</p>
          </div>

          {/* Owner: viewers count button */}
          {isOwn && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleViewers(); }}
              className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
              aria-label={t('viewersLabel')}
            >
              <Eye className="size-3.5" />
              <span className="text-xs font-medium">{story.views_count}</span>
            </button>
          )}

          {/* Owner: delete button */}
          {isOwn && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="rounded-full p-2 bg-black/30 text-white/80 backdrop-blur-sm hover:bg-red-500/40 hover:text-white transition-colors"
              aria-label={t('delete')}
            >
              <Trash2 className="size-4" />
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
            className="rounded-full p-2 bg-black/30 text-white/80 backdrop-blur-sm hover:bg-white/20 hover:text-white transition-colors"
            aria-label={t('closeLabel')}
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* ── Story content ─────────────────────────────────────────────────── */}
        <div
          key={`story-${groupIdx}-${storyIdx}`}
          className="flex h-full w-full items-center justify-center select-none"
          onPointerDown={(e) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'BUTTON' || tag === 'INPUT') return;
            startPressTimer();
          }}
          onPointerUp={clearPressTimer}
          onPointerLeave={clearPressTimer}
        >
          {story.content_type === 'text' ? (
            <div
              className="flex h-full w-full items-center justify-center px-10 py-28"
              style={{ background: story.background_color }}
            >
              <p
                className="text-center text-2xl leading-relaxed"
                style={{
                  color: story.text_color,
                  fontFamily: fontFromStyle(story.font_style),
                  textShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }}
              >
                {story.content}
              </p>
            </div>
          ) : story.content_type === 'image' ? (
            <>
              <Image
                src={story.media_url ?? ''}
                alt=""
                fill
                className="object-contain"
                sizes="430px"
                priority
              />
              {story.content && (
                <div className="absolute inset-x-0 bottom-28 z-10 flex justify-center px-6">
                  <p className="max-w-xs rounded-2xl bg-black/60 px-4 py-2.5 text-center text-sm text-white backdrop-blur-sm leading-relaxed">
                    {story.content}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <video
                ref={videoRef}
                src={story.media_url ?? ''}
                className="h-full w-full object-contain"
                autoPlay
                playsInline
                muted={false}
                poster={story.thumbnail_url ?? undefined}
              />
              {story.content && (
                <div className="absolute inset-x-0 bottom-28 z-10 flex justify-center px-6">
                  <p className="max-w-xs rounded-2xl bg-black/60 px-4 py-2.5 text-center text-sm text-white backdrop-blur-sm leading-relaxed">
                    {story.content}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Tap zones (RTL: right = prev, left = next) ─────────────────── */}
          <button
            className="absolute right-0 top-[80px] bottom-[80px] z-10 w-1/3 focus-visible:outline-none"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label={t('prevSlide')}
          />
          <button
            className="absolute left-0 top-[80px] bottom-[80px] z-10 w-1/3 focus-visible:outline-none"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label={t('nextSlide')}
          />
        </div>

        {/* ── Shared post card (only for story created from a post share) ─────── */}
        {story.shared_post_id != null && (
          <a
            key={`shared-${story.id}`}
            href={`/post/${story.shared_post_id}`}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-3 z-[25] rounded-2xl overflow-hidden backdrop-blur-md border border-white/20 hover:border-white/40 transition-colors"
            style={{ bottom: isOwn ? '72px' : '88px' }}
          >
            <div className="bg-black/40 px-4 py-3 flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg">
                📎
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wide leading-none mb-0.5">{t('sharedPostBadge')}</p>
                <p className="text-sm font-semibold text-white leading-snug">{t('viewOriginalPost')}</p>
              </div>
              <svg viewBox="0 0 20 20" className="size-4 fill-none stroke-white/70 stroke-2 shrink-0" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5" />
                <polyline points="13 3 17 3 17 7" />
                <line x1="17" y1="3" x2="9" y2="11" />
              </svg>
            </div>
          </a>
        )}

        {/* ── Non-owner bottom bar: reactions + reply ───────────────────────── */}
        {!isOwn && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 px-3 pt-12 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}
          >
            {/* Reaction picker */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowReactions((v) => !v); setPaused((v) => !v || v); }}
                className="flex size-10 items-center justify-center rounded-full bg-white/15 text-lg backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-95"
              >
                {reactionEmoji ?? '🤍'}
              </button>

              {showReactions && (
                <div
                  className="absolute bottom-full right-0 mb-2 flex gap-1.5 rounded-2xl bg-zinc-900/90 px-3 py-2.5 shadow-2xl backdrop-blur-md whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  {REACTIONS.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => handleReact(r.key)}
                      className={cn(
                        'text-xl leading-none transition-transform duration-150 hover:scale-125 active:scale-110',
                        localReaction === r.key && 'scale-[1.3]',
                      )}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply input */}
            <div
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); }
                }}
                onFocus={() => { setIsReplyFocused(true); setPaused(true); setShowReactions(false); }}
                onBlur={() => { setIsReplyFocused(false); setPaused(false); }}
                placeholder={t('statusReplyPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
                dir="rtl"
              />
              {replyText.trim() && (
                <button
                  type="button"
                  onClick={handleReply}
                  disabled={isSending}
                  className="shrink-0 text-white/80 transition-colors hover:text-white disabled:opacity-50"
                >
                  <Send className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Owner bottom bar: views shortcut ─────────────────────────────── */}
        {isOwn && !showViewers && (
          <div
            className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center pt-8 bg-gradient-to-t from-black/60 to-transparent"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleToggleViewers}
              className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-white backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-95"
            >
              <Eye className="size-4" />
              <span className="text-sm font-medium">{story.views_count} {t('viewerCountSuffix')}</span>
            </button>
          </div>
        )}

        {/* ── Viewers bottom sheet (owner) ──────────────────────────────────── */}
        {showViewers && (
          <div
            className="absolute inset-x-0 bottom-0 z-30 flex max-h-[56%] flex-col rounded-t-3xl bg-zinc-900/96 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-[4px] w-10 rounded-full bg-white/25" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-white/60" />
                <span className="text-sm font-semibold text-white">
                  {viewers.length > 0 ? `${viewers.length} ${t('viewerCountSuffix')}` : t('viewersLabel')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowViewers(false)}
                className="rounded-full p-1.5 text-white/50 transition-colors hover:text-white"
                aria-label={t('closeLabel')}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Viewers list */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              {viewers.length === 0 ? (
                <div className="flex flex-col items-center py-10">
                  <Eye className="size-8 text-white/20 mb-3" />
                  <p className="text-sm text-white/40">{t('noViewersYet')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {viewers.map((v) => (
                    <div key={v.username} className="flex items-center gap-3">
                      <UserAvatar user={v} size="sm" linkable={false} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white leading-tight">{v.full_name}</p>
                        <p className="truncate text-xs text-white/50 leading-tight">@{v.username}</p>
                      </div>
                      {v.reaction && (
                        <span className="text-xl leading-none">
                          {REACTIONS.find((r) => r.key === v.reaction)?.emoji ?? v.reaction}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fontFromStyle(style: string): string {
  switch (style) {
    case 'serif': return 'Georgia, serif';
    case 'mono':  return 'monospace';
    default:      return 'inherit';
  }
}
