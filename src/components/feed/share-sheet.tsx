'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  X, Link2, Check, MessageCircle, LayoutList,
  Tv2, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLang } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';
import type { PostWithAuthor } from '@/lib/validations/post';
import { ShareToStorySheet } from './share-to-story-sheet';
import { ShareToProfileSheet } from './share-to-profile-sheet';
import { SendViaMessageSheet } from './send-via-message-sheet';

// ── WhatsApp / Facebook SVGs ───────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" className="size-5 fill-white" aria-hidden>
      <path d="M16 1C7.716 1 1 7.716 1 16c0 2.626.685 5.1 1.885 7.245L1 31l8.002-1.862A14.957 14.957 0 0016 31c8.284 0 15-6.716 15-15S24.284 1 16 1zm0 27.333A12.289 12.289 0 019.18 26.24l-.44-.27-4.748 1.106 1.132-4.614-.288-.464A12.333 12.333 0 1116 28.333zM22.41 19.245c-.336-.168-1.988-.98-2.296-1.093-.308-.112-.533-.168-.758.168-.224.336-.868 1.093-1.064 1.317-.196.224-.392.252-.728.084-.336-.168-1.418-.522-2.7-1.664-.998-.89-1.672-1.99-1.868-2.326-.196-.336-.02-.518.148-.686.152-.152.336-.392.504-.588.168-.196.224-.336.336-.56.112-.225.056-.42-.028-.588-.084-.168-.757-1.83-1.037-2.506-.273-.659-.55-.57-.757-.58-.196-.01-.42-.012-.644-.012s-.588.084-.896.42c-.308.336-1.176 1.148-1.176 2.8s1.204 3.248 1.372 3.472c.168.224 2.37 3.62 5.74 5.08.804.348 1.43.556 1.918.714.806.258 1.54.222 2.12.134.646-.098 1.988-.812 2.268-1.596.28-.784.28-1.456.196-1.596-.084-.14-.308-.224-.644-.392z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 32 32" className="size-5 fill-white" aria-hidden>
      <path d="M29 16c0-7.18-5.82-13-13-13S3 8.82 3 16c0 6.49 4.756 11.876 10.98 12.84V19.89H10.49V16h3.49v-3.032c0-3.443 2.051-5.343 5.19-5.343 1.503 0 3.075.268 3.075.268v3.381h-1.732c-1.706 0-2.238 1.06-2.238 2.147V16h3.809l-.609 3.89h-3.2v8.95C24.244 27.876 29 22.49 29 16z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 32 32" className="size-5 fill-white" aria-hidden>
      <path d="M16 2.88c4.27 0 4.778.017 6.465.094 1.56.071 2.41.333 2.975.553a4.96 4.96 0 011.834 1.194 4.963 4.963 0 011.194 1.835c.22.564.482 1.414.553 2.975.077 1.687.094 2.194.094 6.465s-.017 4.778-.094 6.465c-.071 1.56-.333 2.41-.553 2.975a4.96 4.96 0 01-1.194 1.834 4.962 4.962 0 01-1.834 1.194c-.564.22-1.414.482-2.975.553-1.687.077-2.194.094-6.465.094s-4.778-.017-6.465-.094c-1.56-.071-2.41-.333-2.975-.553a4.96 4.96 0 01-1.834-1.194 4.963 4.963 0 01-1.194-1.834c-.22-.564-.482-1.414-.553-2.975C2.9 20.778 2.88 20.271 2.88 16s.017-4.778.094-6.465c.071-1.56.333-2.41.553-2.975A4.963 4.963 0 014.72 4.726a4.963 4.963 0 011.835-1.194c.564-.22 1.414-.482 2.975-.553C11.222 2.897 11.73 2.88 16 2.88zM16 0c-4.344 0-4.888.018-6.595.097C7.8.174 6.636.445 5.62.84A7.845 7.845 0 002.78 2.78 7.845 7.845 0 00.84 5.62C.445 6.636.174 7.8.097 9.405.018 11.112 0 11.656 0 16s.018 4.888.097 6.595c.077 1.605.348 2.77.743 3.785A7.845 7.845 0 002.78 29.22a7.845 7.845 0 002.84 1.94c1.015.395 2.18.666 3.785.743C11.112 31.982 11.656 32 16 32s4.888-.018 6.595-.097c1.605-.077 2.77-.348 3.785-.743a7.845 7.845 0 002.84-1.94 7.845 7.845 0 001.94-2.84c.395-1.015.666-2.18.743-3.785C31.982 20.888 32 20.344 32 16s-.018-4.888-.097-6.595c-.077-1.605-.348-2.77-.743-3.785A7.845 7.845 0 0029.22 2.78 7.845 7.845 0 0026.38.84C25.364.445 24.2.174 22.595.097 20.888.018 20.344 0 16 0zm0 7.784a8.216 8.216 0 100 16.432 8.216 8.216 0 000-16.432zm0 13.549a5.333 5.333 0 110-10.666 5.333 5.333 0 010 10.666zm10.462-13.87a1.92 1.92 0 11-3.84 0 1.92 1.92 0 013.84 0z" />
    </svg>
  );
}

// ── Primary action button ─────────────────────────────────────────────────────

function ShareOption({
  icon,
  label,
  gradient,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  gradient: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 disabled:pointer-events-none disabled:opacity-40"
    >
      <div
        className={cn(
          'flex size-14 items-center justify-center rounded-2xl text-white shadow-sm',
          'transition-transform active:scale-95 hover:scale-105',
          gradient
        )}
      >
        {icon}
      </div>
      <span className="text-[11px] font-medium text-foreground/80 leading-tight text-center max-w-[60px]">
        {label}
      </span>
    </button>
  );
}

// ── External share row ────────────────────────────────────────────────────────

function ExternalRow({
  href,
  icon,
  bgClass,
  label,
  description,
  onClick,
}: {
  href?: string;
  icon: React.ReactNode;
  bgClass: string;
  label: string;
  description: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted">
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', bgClass)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-start">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <button type="button" onClick={onClick}>{inner}</button>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SubSheet = 'story' | 'profile' | 'message' | null;

type Props = {
  post: PostWithAuthor;
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
};

// ── Main Component ────────────────────────────────────────────────────────────

export function ShareSheet({ post, open, onClose, isAuthenticated }: Props) {
  const { t, dir } = useLang();
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subSheet, setSubSheet] = useState<SubSheet>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      setSubSheet(null);
      const t = setTimeout(() => setShouldRender(false), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted || !shouldRender) return null;

  const postUrl = `${window.location.origin}/post/${post.id}`;
  const shareText = post.content?.slice(0, 120) ?? t('shareDefaultText');

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success(t('linkCopiedSuccess'));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t('copyLinkFailed'));
    }
  }

  const firstImage = post.media.find((m) => m.type === 'image');

  const content = (
    <>
      {/* ── Backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* ── Sheet ── */}
      <div
        className={cn(
          'fixed z-[61] w-full bg-background shadow-2xl',
          // Mobile: bottom sheet
          'bottom-0 start-0 end-0 rounded-t-2xl',
          // Desktop: centered modal (use physical left-1/2 so RTL doesn't flip it)
          'sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
          'transition-all duration-350 ease-out',
          isVisible
            ? 'translate-y-0 opacity-100 sm:scale-100'
            : 'translate-y-full opacity-0 sm:translate-y-0 sm:scale-95'
        )}
        dir={dir}
        style={{ maxHeight: '92dvh' }}
      >
        {/* Drag handle — mobile */}
        <div className="flex justify-center pt-2.5 pb-0 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">{t('shareSheetTitle')}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('closeLabel')}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Body (sub-sheet OR main) ── */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92dvh - 120px)' }}>
          {subSheet === 'story' && (
            <div className="pb-4 pt-2">
              <ShareToStorySheet
                post={post}
                onBack={() => setSubSheet(null)}
                onClose={() => { setSubSheet(null); onClose(); }}
              />
            </div>
          )}
          {subSheet === 'profile' && (
            <div className="pb-4 pt-2">
              <ShareToProfileSheet
                post={post}
                onBack={() => setSubSheet(null)}
                onClose={() => { setSubSheet(null); onClose(); }}
              />
            </div>
          )}
          {subSheet === 'message' && (
            <div className="pb-4 pt-3">
              <SendViaMessageSheet
                post={post}
                onBack={() => setSubSheet(null)}
                onClose={() => { setSubSheet(null); onClose(); }}
              />
            </div>
          )}

          {!subSheet && (
            <div className="px-4 pb-4 pt-3 space-y-4">
              {/* Post preview strip */}
              <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                {firstImage ? (
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                    <Image src={firstImage.url} alt="" fill className="object-cover" sizes="56px" />
                  </div>
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                    📝
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{post.author.full_name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {post.content ?? (post.media.length > 0 ? `${post.media.length} ${t('mediaFilesLabel')}` : t('post'))}
                  </p>
                </div>
              </div>

              {/* Primary action grid */}
              <div className="grid grid-cols-4 gap-3">
                <ShareOption
                  icon={<Tv2 className="size-6" />}
                  label={t('shareToMyStory')}
                  gradient="bg-gradient-to-br from-purple-500 to-pink-500"
                  onClick={() => setSubSheet('story')}
                  disabled={!isAuthenticated}
                />
                <ShareOption
                  icon={<LayoutList className="size-6" />}
                  label={t('shareToMyProfile')}
                  gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                  onClick={() => setSubSheet('profile')}
                  disabled={!isAuthenticated}
                />
                <ShareOption
                  icon={<MessageCircle className="size-6" />}
                  label={t('shareViaMessage')}
                  gradient="bg-gradient-to-br from-green-500 to-emerald-500"
                  onClick={() => setSubSheet('message')}
                  disabled={!isAuthenticated}
                />
                <ShareOption
                  icon={
                    copied ? <Check className="size-6" /> : <Link2 className="size-6" />
                  }
                  label={copied ? t('linkCopied') : t('copyLinkLabel')}
                  gradient={
                    copied
                      ? 'bg-green-600'
                      : 'bg-gradient-to-br from-slate-500 to-slate-700'
                  }
                  onClick={handleCopyLink}
                />
              </div>

              {/* External sharing */}
              <div className="border-t pt-3">
                <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  {t('externalShareLabel')}
                </p>
                <div className="space-y-0.5">
                  <ExternalRow
                    href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${postUrl}`)}`}
                    icon={<WhatsAppIcon />}
                    bgClass="bg-[#25D366]"
                    label={t('whatsappLabel')}
                    description={t('whatsappDesc')}
                  />
                  <ExternalRow
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
                    icon={<FacebookIcon />}
                    bgClass="bg-[#1877F2]"
                    label={t('facebookLabel')}
                    description={t('facebookDesc')}
                  />
                  <ExternalRow
                    icon={<InstagramIcon />}
                    bgClass="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400"
                    label={t('instagramLabel')}
                    description={t('instagramDesc')}
                    onClick={() => {
                      navigator.clipboard.writeText(postUrl);
                      toast.success(t('instagramCopiedHint'));
                    }}
                  />
                </div>
              </div>

              {/* Share count hint */}
              {post.shares_count > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {post.shares_count} {t('shareCountLabel')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
