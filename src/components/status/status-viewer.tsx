'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Trash2, Eye, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ImageLightbox } from '@/components/shared/image-lightbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  viewStatus,
  toggleStatusLike,
  replyToStatus,
  deleteStatus,
  getStatusViewers,
  type StatusGroup,
  type StatusWithUser,
} from '@/lib/actions/status';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

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

type Viewer = { username: string; full_name: string; avatar_url: string | null; reaction: string | null };

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
  const [coverOpen, setCoverOpen] = useState(false);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const group = groups[groupIdx] as StatusGroup | undefined;
  const story = group?.statuses[storyIdx] as StatusWithUser | undefined;
  const isOwn = story?.user_id === currentUserId;

  // ── Reset on open ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setGroupIdx(initialGroupIdx);
      setStoryIdx(0);
    }
  }, [open, initialGroupIdx]);

  // ── Per-story side effects ─────────────────────────────────────────────────

  useEffect(() => {
    if (!story) return;
    setLocalReaction(story.my_reaction);
    setShowReactions(false);
    setShowViewers(false);
    setReplyText('');
    setIsReplyFocused(false);

    if (!story.viewed) {
      viewStatus(story.id)
        .then(() => onViewed(story.id))
        .catch(() => {});
    }
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-advance ───────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!open || paused || isReplyFocused || !story) return;
    const ms = (story.duration ?? 5) * 1000;
    storyTimer.current = setTimeout(advance, ms);
    return () => {
      if (storyTimer.current) clearTimeout(storyTimer.current);
    };
  }, [open, paused, isReplyFocused, story?.id, advance]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (e.key === 'ArrowRight') goPrev();
      if (e.key === 'ArrowLeft') goNext();
      if (e.key === 'Escape') onOpenChange(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, groupIdx, storyIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Long-press pause ───────────────────────────────────────────────────────

  function handlePointerDown() {
    pressTimer.current = setTimeout(() => setPaused(true), 180);
  }

  function handlePointerUp() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setPaused(false);
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
      toast.success('تم إرسال الرد');
      setReplyText('');
    }
  }

  // ── Owner: viewers ─────────────────────────────────────────────────────────

  async function handleShowViewers() {
    if (!story) return;
    if (!showViewers) {
      const data = await getStatusViewers(story.id);
      setViewers(data);
    }
    setShowViewers((v) => !v);
  }

  // ── Owner: delete ──────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!story) return;
    const result = await deleteStatus(story.id);
    if (result.error) { toast.error(result.error); return; }
    onDeleted(story.id);
    toast.success('حُذفت الحالة');
    if (storyIdx < (group?.statuses.length ?? 0) - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
    } else {
      onOpenChange(false);
    }
  }

  if (!group || !story) return null;

  const durationMs = (story.duration ?? 5) * 1000;
  const timeAgo = formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: ar });
  const reactionEmoji = REACTIONS.find((r) => r.key === localReaction)?.emoji;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col overflow-hidden border-none bg-black p-0 [&>button]:hidden"
        style={{ borderRadius: 0 }}
      >
        {/* ── Progress bars ─────────────────────────────────────────────── */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-2 pt-2">
          {group.statuses.map((s, i) => (
            <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              {i < storyIdx ? (
                <div className="h-full w-full rounded-full bg-white" />
              ) : i === storyIdx ? (
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    animation: `statusProgress ${durationMs}ms linear forwards`,
                    animationPlayState: (paused || isReplyFocused) ? 'paused' : 'running',
                  }}
                />
              ) : (
                <div className="h-full w-0 rounded-full bg-white" />
              )}
            </div>
          ))}
        </div>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="absolute inset-x-0 top-5 z-20 flex items-center gap-3 px-3 py-2">
          <button
            type="button"
            onClick={() => story.user.cover_url && setCoverOpen(true)}
            aria-label={story.user.cover_url ? 'عرض صورة الغلاف' : undefined}
            className={story.user.cover_url ? 'cursor-pointer rounded-full ring-2 ring-white/40 transition-opacity hover:opacity-80' : 'cursor-default'}
          >
            <UserAvatar user={story.user} size="sm" linkable={false} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white drop-shadow">
              {story.user.full_name}
            </p>
            <p className="text-[11px] text-white/70">{timeAgo}</p>
          </div>

          {isOwn && (
            <button
              onClick={handleShowViewers}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Eye className="size-4" />
              <span className="text-xs">{story.views_count}</span>
            </button>
          )}

          {isOwn && (
            <button
              onClick={handleDelete}
              className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-red-400"
            >
              <Trash2 className="size-4" />
            </button>
          )}

          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ── Story content (with long-press area) ─────────────────────── */}
        <div
          className="relative flex h-full w-full items-center justify-center select-none"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {story.content_type === 'text' ? (
            <div
              className="flex h-full w-full items-center justify-center px-10 py-24"
              style={{ background: story.background_color }}
            >
              <p
                className="text-center text-2xl leading-relaxed"
                style={{
                  color: story.text_color,
                  fontFamily: fontFromStyle(story.font_style),
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
                sizes="448px"
                priority
              />
              {story.content && (
                <div className="absolute inset-x-0 bottom-24 flex justify-center px-6">
                  <p className="rounded-xl bg-black/60 px-4 py-2 text-center text-sm text-white">
                    {story.content}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <video
                src={story.media_url ?? ''}
                className="h-full w-full object-contain"
                autoPlay
                playsInline
                poster={story.thumbnail_url ?? undefined}
              />
              {story.content && (
                <div className="absolute inset-x-0 bottom-24 flex justify-center px-6">
                  <p className="rounded-xl bg-black/60 px-4 py-2 text-center text-sm text-white">
                    {story.content}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Tap zones — RTL: right = prev, left = next */}
          <button
            className="absolute right-0 top-0 z-10 h-full w-1/3 focus-visible:outline-none"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="السابق"
          />
          <button
            className="absolute left-0 top-0 z-10 h-full w-1/3 focus-visible:outline-none"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="التالي"
          />
        </div>

        {/* ── Group navigation arrows ───────────────────────────────────── */}
        {groupIdx > 0 && (
          <button
            className="absolute right-1 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white shadow"
            onClick={goPrev}
            aria-label="المجموعة السابقة"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
        {groupIdx < groups.length - 1 && (
          <button
            className="absolute left-1 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white shadow"
            onClick={goNext}
            aria-label="المجموعة التالية"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        {/* ── Viewers list (owner only) ─────────────────────────────────── */}
        {showViewers && (
          <div className="absolute inset-x-0 bottom-16 z-30 max-h-44 overflow-y-auto bg-black/85 px-4 py-3 backdrop-blur-sm">
            {viewers.length === 0 ? (
              <p className="text-center text-sm text-white/60">لا توجد مشاهدات بعد</p>
            ) : (
              <div className="flex flex-col gap-2">
                {viewers.map((v) => (
                  <div key={v.username} className="flex items-center gap-2">
                    <UserAvatar user={v} size="sm" linkable={false} />
                    <span className="flex-1 text-sm text-white">{v.full_name}</span>
                    {v.reaction && (
                      <span className="text-base leading-none">
                        {REACTIONS.find((r) => r.key === v.reaction)?.emoji}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bottom bar: reactions + reply (non-owner only) ───────────── */}
        {!isOwn && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-5 pt-10">
            {/* Reaction picker */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowReactions((v) => !v)}
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-xl transition-colors hover:bg-white/20"
              >
                {reactionEmoji ?? '🤍'}
              </button>
              {showReactions && (
                <div className="absolute bottom-full mb-2 flex gap-1.5 rounded-2xl bg-black/80 px-3 py-2 shadow-xl backdrop-blur-md">
                  {REACTIONS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => handleReact(r.key)}
                      className={[
                        'text-xl transition-transform hover:scale-125 active:scale-110',
                        localReaction === r.key ? 'scale-125' : '',
                      ].join(' ')}
                      title={r.key}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply input — focuses pause the story automatically */}
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleReply(); }}
              onFocus={() => setIsReplyFocused(true)}
              onBlur={() => setIsReplyFocused(false)}
              placeholder="ردّ على الحالة..."
              className="h-9 flex-1 rounded-full border-white/20 bg-white/10 text-sm text-white placeholder:text-white/50 focus-visible:ring-white/30"
              dir="rtl"
            />

            <Button
              size="icon"
              variant="ghost"
              disabled={!replyText.trim() || isSending}
              onClick={handleReply}
              className="shrink-0 rounded-full text-white hover:bg-white/10"
            >
              <Send className="size-4" />
            </Button>
          </div>
        )}
      </DialogContent>

      {/* Cover photo lightbox — z-[300] to sit above the Dialog */}
      {story.user.cover_url && (
        <ImageLightbox
          src={story.user.cover_url}
          alt={`غلاف ${story.user.full_name}`}
          open={coverOpen}
          onClose={() => setCoverOpen(false)}
          allowDownload
        />
      )}
    </Dialog>
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
