'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Eye, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { viewStatus, deleteStatus, type StatusWithUser } from '@/lib/actions/status';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const DURATION_MS = 5000;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: StatusWithUser[];
  initialIndex: number;
  currentUserId: string;
  onViewed: (statusId: string) => void;
  onDeleted: (statusId: string) => void;
};

export function StatusViewer({
  open,
  onOpenChange,
  statuses,
  initialIndex,
  currentUserId,
  onViewed,
  onDeleted,
}: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = statuses[idx];
  const isOwn = current?.user_id === currentUserId;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goNext = useCallback(() => {
    clearTimer();
    setIdx((prev) => {
      const next = prev + 1;
      if (next >= statuses.length) {
        onOpenChange(false);
        return prev;
      }
      return next;
    });
  }, [clearTimer, onOpenChange, statuses.length]);

  const goPrev = useCallback(() => {
    clearTimer();
    setIdx((prev) => Math.max(0, prev - 1));
  }, [clearTimer]);

  // Sync index when dialog opens with a new initialIndex
  useEffect(() => {
    if (open) setIdx(initialIndex);
  }, [open, initialIndex]);

  // Mark viewed + start auto-advance timer on each index change
  useEffect(() => {
    if (!open || !current) return;

    if (!current.viewed) {
      viewStatus(current.id)
        .then(() => onViewed(current.id))
        .catch(() => {});
    }

    timerRef.current = setTimeout(goNext, DURATION_MS);
    return clearTimer;
  }, [idx, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goNext();
      else if (e.key === 'ArrowRight') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, goNext, goPrev]);

  async function handleDelete() {
    if (!current) return;
    const result = await deleteStatus(current.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    onDeleted(current.id);
    toast.success('تم حذف الحالة');
    onOpenChange(false);
  }

  if (!current) return null;

  const isLight =
    current.background_color === '#FFFFFF' || current.background_color === '#FFC107';
  const textColor = isLight ? '#1A1A1A' : '#FFFFFF';
  const controlColor = isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.92)';

  const timeAgo = formatDistanceToNow(new Date(current.created_at), {
    addSuffix: true,
    locale: ar,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[88vh] max-h-[680px] w-[min(100vw,420px)] overflow-hidden rounded-2xl border-0 p-0 [&>button]:hidden"
        style={{ backgroundColor: current.background_color }}
        dir="rtl"
      >
        {/* ── Progress bars ───────────────────────────────────── */}
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 px-2 pt-2">
          {statuses.map((s, i) => (
            <div
              key={s.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                key={i === idx ? `active-${idx}` : `done-${i}`}
                className="h-full bg-white"
                style={
                  i === idx
                    ? {
                        animation: `statusProgress ${DURATION_MS}ms linear forwards`,
                        transformOrigin: 'left',
                      }
                    : {
                        transform: i < idx ? 'scaleX(1)' : 'scaleX(0)',
                        transformOrigin: 'left',
                      }
                }
              />
            </div>
          ))}
        </div>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="absolute inset-x-0 top-4 z-10 flex items-center gap-2 px-3 pt-3">
          <UserAvatar user={current.user} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: controlColor }}>
              {current.user.full_name}
            </p>
            <p className="text-xs opacity-70" style={{ color: controlColor }}>
              {timeAgo}
            </p>
          </div>

          {isOwn && (
            <span
              className="flex items-center gap-1 text-xs opacity-80"
              style={{ color: controlColor }}
            >
              <Eye className="size-3.5" />
              {current.views_count}
            </span>
          )}

          {isOwn && (
            <button
              onClick={handleDelete}
              className="rounded-full p-1 transition-opacity hover:opacity-70"
              style={{ color: controlColor }}
              aria-label="حذف الحالة"
            >
              <Trash2 className="size-4" />
            </button>
          )}

          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 transition-opacity hover:opacity-70"
            style={{ color: controlColor }}
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="flex h-full items-center justify-center px-10 pb-16 pt-20">
          <p
            className="break-words text-center text-2xl font-bold leading-relaxed"
            style={{ color: textColor }}
          >
            {current.content}
          </p>
        </div>

        {/* ── Tap zones: prev / next ───────────────────────────── */}
        <button
          onClick={goPrev}
          disabled={idx === 0}
          className="absolute inset-y-0 start-0 z-20 flex w-1/3 items-center justify-start ps-2 disabled:opacity-0"
          aria-label="السابق"
        >
          <ChevronRight className="size-8 drop-shadow" style={{ color: controlColor }} />
        </button>
        <button
          onClick={goNext}
          className="absolute inset-y-0 end-0 z-20 flex w-1/3 items-center justify-end pe-2"
          aria-label="التالي"
        >
          <ChevronLeft className="size-8 drop-shadow" style={{ color: controlColor }} />
        </button>
      </DialogContent>
    </Dialog>
  );
}
