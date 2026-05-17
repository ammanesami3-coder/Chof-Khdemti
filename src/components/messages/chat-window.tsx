'use client';

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Send, Check, ChevronDown } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useLang } from '@/lib/i18n/language-context';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  sendMessage,
  markConversationRead,
  toggleMessageReaction,
  deleteMessage,
} from '@/lib/actions/messages';
import type { SentMessage, MessageReaction, AttachmentMetadata } from '@/lib/actions/messages';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { useNotificationSound } from '@/hooks/use-notification-sound';
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt';
import { UserAvatar } from '@/components/shared/user-avatar';
import { VoiceRecorder } from '@/components/messages/voice-recorder';
import { VoiceMessageBubble } from '@/components/messages/voice-message-bubble';
import { MessageActionBar } from '@/components/messages/message-action-bar';
import { MessageActionSheet } from '@/components/messages/message-action-sheet';
import type { ActiveMessage } from '@/components/messages/message-action-sheet';
import { ReactionsDisplay } from '@/components/messages/reactions-display';
import { ReplyPreviewBar } from '@/components/messages/reply-preview-bar';
import { AttachmentBubble } from '@/components/messages/attachment-bubble';
import { AttachmentPicker } from '@/components/messages/attachment-picker';
import type { AttachmentType, AttachmentPreviewInfo } from '@/components/messages/attachment-picker';
import { LocationMessageCard } from '@/components/messages/location-message-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StatusGroup, StatusWithUser } from '@/lib/types/status.types';

// Lazy-load StatusViewer to keep initial bundle small
const StatusViewerLazy = dynamic(
  () => import('@/components/status/status-viewer').then((m) => m.StatusViewer),
  { ssr: false },
);

// ── Public types (imported by page.tsx) ───────────────────────────────────────

export type RepliedStatus = {
  content_type:     'text' | 'image' | 'video';
  content:          string | null;
  media_url:        string | null;
  thumbnail_url:    string | null;
  background_color: string;
  text_color:       string;
  user_username:    string;
  user_full_name:   string;
  expires_at:       string | null;
} | null;

export type RepliedMessage = {
  id:                   string;
  sender_id:            string;
  content:              string | null;
  message_type:         string;
  voice_url?:           string | null;
  deleted_for_everyone?: boolean;
};

export type { MessageReaction };

// ── Internal types ────────────────────────────────────────────────────────────

type SharedPostData = {
  content:          string | null;
  media:            Array<{ type: string; url: string; thumbnail: string }>;
  author_full_name: string;
  author_username:  string;
} | null;

type MessageData = {
  id:                   string;
  sender_id:            string;
  content:              string | null;
  is_read:              boolean;
  created_at:           string;
  message_type?:        'text' | 'voice' | 'post_share' | 'image' | 'video' | 'document' | 'audio' | 'location';
  voice_url?:           string | null;
  voice_duration?:      number | null;
  reply_to_status_id?:  string | null;
  replied_status?:      RepliedStatus;
  shared_post_id?:      string | null;
  shared_post_data?:    SharedPostData;
  reply_to_message_id?: string | null;
  replied_message?:     RepliedMessage | null;
  reactions?:           MessageReaction[];
  deleted_at?:            string | null;
  deleted_for_everyone?:  boolean;
  deleted_by_user_ids?:   string[] | null;
  attachment_url?:        string | null;
  attachment_metadata?:   AttachmentMetadata | null;
  is_optimistic?:         boolean;
  // Upload state (client-side only, not in DB)
  upload_status?:         'uploading' | 'failed';
  upload_progress?:       number; // 0-100
  preview_url?:           string; // local blob URL for image preview during upload
  onCancelUpload?:        () => void;
  onRetryUpload?:         () => void;
};

type ReplyTarget = {
  id:          string;
  content:     string | null;
  senderName:  string;
  messageType: string;
};

type Partner = {
  id:         string;
  username:   string;
  full_name:  string;
  avatar_url: string | null;
};

type Props = {
  conversationId:       string;
  currentUserId:        string;
  currentUserAvatarUrl: string | null;
  accountType:          string;
  partner:              Partner;
  initialMessages:      MessageData[];
  initialCanReply:      boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) { return format(parseISO(iso), 'HH:mm'); }

// ── StatusReplyPreview ────────────────────────────────────────────────────────

function StatusReplyPreview({
  replied_status,
  isSent,
  onClick,
  videoLabel,
  imageLabel,
}: {
  replied_status: NonNullable<RepliedStatus>;
  isSent:         boolean;
  onClick:        () => void;
  videoLabel:     string;
  imageLabel:     string;
}) {
  const hasThumb = replied_status.content_type !== 'text' && !!replied_status.thumbnail_url;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        'mb-2 flex w-full overflow-hidden rounded-xl text-xs text-start',
        'transition-opacity hover:opacity-80 active:opacity-60',
        isSent ? 'bg-primary-foreground/20' : 'bg-black/10',
      )}
    >
      {replied_status.content_type === 'text' ? (
        <div className="w-1 shrink-0" style={{ background: replied_status.background_color }} />
      ) : hasThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={replied_status.thumbnail_url!} alt="" className="h-14 w-14 shrink-0 object-cover" />
      ) : (
        <div className="w-1 shrink-0 bg-current opacity-20" />
      )}
      <div className="min-w-0 flex-1 px-2.5 py-1.5">
        <p className={cn('font-semibold', isSent ? 'text-primary-foreground/80' : 'text-foreground/70')}>
          @{replied_status.user_username}
        </p>
        {replied_status.content ? (
          <p className={cn('line-clamp-2 leading-snug', isSent ? 'text-primary-foreground/60' : 'text-foreground/50')}>
            {replied_status.content}
          </p>
        ) : (
          <p className={cn('italic', isSent ? 'text-primary-foreground/60' : 'text-foreground/50')}>
            {replied_status.content_type === 'video' ? `🎬 ${videoLabel}` : `📷 ${imageLabel}`}
          </p>
        )}
      </div>
    </button>
  );
}

// ── MessageReplyPreview ───────────────────────────────────────────────────────

function MessageReplyPreview({
  replied_message,
  senderName,
  isSent,
  onClick,
  deletedLabel,
  voiceLabel,
  attachmentLabel,
}: {
  replied_message: RepliedMessage;
  senderName:      string;
  isSent:          boolean;
  onClick:         () => void;
  deletedLabel:    string;
  voiceLabel:      string;
  attachmentLabel: string;
}) {
  const text = replied_message.deleted_for_everyone
    ? `🚫 ${deletedLabel}`
    : replied_message.content
      ? replied_message.content.slice(0, 60) + (replied_message.content.length > 60 ? '…' : '')
      : replied_message.message_type === 'voice'
        ? `🎤 ${voiceLabel}`
        : `📎 ${attachmentLabel}`;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        'mb-2 flex w-full items-stretch overflow-hidden rounded-xl text-start text-xs',
        'transition-opacity hover:opacity-80 active:opacity-60',
        isSent ? 'bg-primary-foreground/20' : 'bg-black/10',
      )}
    >
      <div className={cn('w-1 shrink-0 rounded-s-xl', isSent ? 'bg-primary-foreground/60' : 'bg-primary/60')} />
      <div className="min-w-0 flex-1 px-2.5 py-1.5">
        <p className={cn('font-semibold', isSent ? 'text-primary-foreground/80' : 'text-foreground/70')}>
          {senderName}
        </p>
        <p className={cn('line-clamp-1 leading-snug', isSent ? 'text-primary-foreground/60' : 'text-foreground/50')}>
          {text}
        </p>
      </div>
    </button>
  );
}

// ── ChatWindow ────────────────────────────────────────────────────────────────

export function ChatWindow({
  conversationId,
  currentUserId,
  currentUserAvatarUrl,
  accountType,
  partner,
  initialMessages,
  initialCanReply,
}: Props) {
  const { t } = useLang();

  const getDateLabel = (iso: string) => {
    const d = parseISO(iso);
    if (isToday(d))     return t('today');
    if (isYesterday(d)) return t('yesterday');
    return format(d, 'EEEE d MMMM', { locale: ar });
  };

  // ── Core state ─────────────────────────────────────────────
  const [messages, setMessages]         = useState<MessageData[]>(initialMessages);
  const [content, setContent]           = useState('');
  const [isSending, setIsSending]       = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // Session D — Status viewer
  const [viewerOpen, setViewerOpen]     = useState(false);
  const [viewerGroup, setViewerGroup]   = useState<StatusGroup | null>(null);

  // Session A — Reply
  const [replyingTo, setReplyingTo]     = useState<ReplyTarget | null>(null);
  const [highlightedId, setHighlighted] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn]   = useState(false);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const [sheetMsg, setSheetMsg]       = useState<ActiveMessage | null>(null);

  // ── Refs ────────────────────────────────────────────────────
  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const messagesAreaRef   = useRef<HTMLDivElement>(null);
  const isNearBottomRef   = useRef(true);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const supabaseRef       = useRef(createClient());
  const supabase          = supabaseRef.current;
  const messageRefs        = useRef<Map<string, HTMLDivElement>>(new Map());
  // Tracks pending uploads: tempId → {messageType, realIdFromRealtime?}
  // Used to deduplicate realtime INSERTs with optimistic upload messages.
  const pendingUploads = useRef<Map<string, { messageType: string; realIdFromRealtime?: string }>>(new Map());
  const bubbleLongPressRef = useRef<{
    timer:    ReturnType<typeof setTimeout>;
    rect:     DOMRect;
    startPos: { x: number; y: number };
  } | null>(null);

  // ── Hooks ───────────────────────────────────────────────────
  const { data: subStatus } = useSubscriptionStatus();
  const { playMessage }     = useNotificationSound();
  const queryClient         = useQueryClient();

  const canReply = accountType !== 'artisan'
    ? true
    : subStatus !== undefined ? subStatus.canReply : initialCanReply;

  // ── Fetch replied status enrichment (for realtime messages) ─
  const fetchRepliedStatus = useCallback(async (statusId: string): Promise<RepliedStatus> => {
    const { data: st } = await supabase
      .from('status_updates')
      .select('content_type, content, media_url, thumbnail_url, background_color, text_color, expires_at, user_id')
      .eq('id', statusId)
      .maybeSingle();
    if (!st) return null;
    const { data: u } = await supabase
      .from('users').select('username, full_name').eq('id', st.user_id).maybeSingle();
    return {
      content_type:     st.content_type as 'text' | 'image' | 'video',
      content:          st.content ?? null,
      media_url:        st.media_url ?? null,
      thumbnail_url:    st.thumbnail_url ?? null,
      background_color: (st.background_color as string) ?? '#1877F2',
      text_color:       (st.text_color as string) ?? '#FFFFFF',
      user_username:    u?.username ?? '',
      user_full_name:   u?.full_name ?? '',
      expires_at:       (st.expires_at as string) ?? null,
    };
  }, [supabase]);

  // ── Fetch replied message enrichment (for realtime messages) ─
  const fetchRepliedMessage = useCallback(async (msgId: string): Promise<RepliedMessage | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('messages')
      .select('id, sender_id, content, message_type, voice_url, deleted_for_everyone')
      .eq('id', msgId)
      .maybeSingle() as { data: RepliedMessage | null };
    return data;
  }, [supabase]);

  // ── Status viewer opener (Session D) ───────────────────────
  const handleStatusReplyClick = useCallback(async (
    statusId: string,
    expiresAt: string | null,
  ) => {
    if (!expiresAt || new Date(expiresAt) <= new Date()) {
      toast.info(t('statusExpired'));
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: st } = await (supabase as any)
        .from('status_updates')
        .select('id, user_id, content_type, content, media_url, thumbnail_url, background_color, text_color, font_style, duration, created_at, expires_at, views_count, likes_count, shared_post_id')
        .eq('id', statusId)
        .maybeSingle() as { data: Record<string, unknown> | null };

      if (!st || new Date(st.expires_at as string) <= new Date()) {
        toast.info(t('statusExpired'));
        return;
      }

      const [{ data: usr }, { data: prof }] = await Promise.all([
        supabase.from('users').select('id, username, full_name').eq('id', st.user_id as string).maybeSingle(),
        supabase.from('profiles').select('avatar_url, cover_url').eq('user_id', st.user_id as string).maybeSingle(),
      ]);
      if (!usr) return;

      const statusWithUser: StatusWithUser = {
        id:               st.id as string,
        user_id:          st.user_id as string,
        content_type:     st.content_type as 'text' | 'image' | 'video',
        content:          st.content as string | null,
        media_url:        st.media_url as string | null,
        thumbnail_url:    st.thumbnail_url as string | null,
        background_color: (st.background_color as string) ?? '#1877F2',
        text_color:       (st.text_color as string) ?? '#FFFFFF',
        font_style:       (st.font_style as string) ?? 'default',
        duration:         (st.duration as number) ?? 5,
        created_at:       st.created_at as string,
        expires_at:       st.expires_at as string,
        views_count:      (st.views_count as number) ?? 0,
        likes_count:      (st.likes_count as number) ?? 0,
        viewed:           true,
        my_reaction:      null,
        shared_post_id:   st.shared_post_id as string | null,
        user: {
          id:         usr.id,
          username:   usr.username,
          full_name:  usr.full_name,
          avatar_url: prof?.avatar_url ?? null,
          cover_url:  prof?.cover_url ?? null,
        },
      };

      setViewerGroup({
        user:        statusWithUser.user,
        statuses:    [statusWithUser],
        hasUnviewed: false,
      });
      setViewerOpen(true);
    } catch {
      toast.error(t('statusLoadError'));
    }
  }, [supabase, t]);

  // ── Mark read on mount ──────────────────────────────────────
  useEffect(() => {
    markConversationRead(conversationId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    });
  }, [conversationId, queryClient]);

  // ── Realtime: new messages ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const raw = payload.new as MessageData;
        const newMsg: MessageData = { ...raw, reactions: [], replied_message: undefined };

        // ── Media messages from self: match against pending uploads ──────────
        // When a voice/attachment upload completes, the realtime INSERT may arrive
        // before or after the server action callback updates state. We use the
        // pendingUploads map to correctly replace the optimistic temp message.
        if (
          newMsg.sender_id === currentUserId &&
          newMsg.message_type &&
          newMsg.message_type !== 'text'
        ) {
          // Find the oldest unmatched pending upload of the same type
          let matchedTempId: string | null = null;
          for (const [tId, meta] of pendingUploads.current.entries()) {
            if (meta.messageType === newMsg.message_type && !meta.realIdFromRealtime) {
              matchedTempId = tId; break;
            }
          }

          if (matchedTempId) {
            const tId = matchedTempId;
            // Record the real DB id so the server action callback knows realtime already handled it
            const existing = pendingUploads.current.get(tId)!;
            pendingUploads.current.set(tId, { ...existing, realIdFromRealtime: newMsg.id });

            setMessages((prev) => {
              const tempIdx = prev.findIndex((m) => m.id === tId);
              if (tempIdx !== -1) {
                // Temp message still in state: revoke blob URLs and replace with real message
                const prevTemp = prev[tempIdx]!;
                if (prevTemp.voice_url?.startsWith('blob:')) URL.revokeObjectURL(prevTemp.voice_url);
                if (prevTemp.preview_url?.startsWith('blob:')) URL.revokeObjectURL(prevTemp.preview_url);
                const next = [...prev];
                next[tempIdx] = { ...newMsg, replied_message: prevTemp.replied_message };
                return next;
              }
              // Temp already replaced by server action — just guard against duplicates
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Enrich reply reference if needed
            if (raw.reply_to_message_id) {
              fetchRepliedMessage(raw.reply_to_message_id).then((rm) => {
                if (!rm) return;
                setMessages((prev) =>
                  prev.map((m) => m.id === newMsg.id && !m.replied_message ? { ...m, replied_message: rm } : m),
                );
              });
            }
            return; // own media message — no sound, no mark-read
          }

          // No pending upload matched — normal dedup (e.g. message sent from another device)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          return;
        }
        // ── End media handling ────────────────────────────────────────────────

        setMessages((prev) => {
          // Replace our own optimistic text message (matched by content + sender)
          const tempIdx = prev.findIndex(
            (m) => m.is_optimistic && m.content === newMsg.content && m.sender_id === newMsg.sender_id,
          );
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = { ...newMsg, replied_message: prev[tempIdx]?.replied_message };
            return next;
          }
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          // Incoming message from the other user — try to enrich replied_message
          if (newMsg.reply_to_message_id) {
            const original = prev.find((m) => m.id === newMsg.reply_to_message_id);
            if (original) {
              newMsg.replied_message = {
                id:                   original.id,
                sender_id:            original.sender_id,
                content:              original.content,
                message_type:         original.message_type ?? 'text',
                voice_url:            original.voice_url ?? null,
                deleted_for_everyone: original.deleted_for_everyone ?? false,
              };
            }
          }

          return [...prev, newMsg];
        });

        if (raw.reply_to_message_id) {
          fetchRepliedMessage(raw.reply_to_message_id).then((rm) => {
            if (!rm) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === raw.id && !m.replied_message ? { ...m, replied_message: rm } : m,
              ),
            );
          });
        }

        if (raw.reply_to_status_id) {
          fetchRepliedStatus(raw.reply_to_status_id).then((rs) =>
            setMessages((prev) => prev.map((m) => m.id === raw.id ? { ...m, replied_status: rs } : m)),
          );
        }

        if (newMsg.sender_id !== currentUserId) {
          playMessage();
          markConversationRead(conversationId).then(() =>
            queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] }),
          );
        }
      })
      // Realtime: soft-delete and other server-side updates
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as Partial<MessageData> & { id: string };
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== updated.id) return m;
            return {
              ...m,
              ...updated,
              // Preserve client-side enrichments that are not DB columns
              replied_message: m.replied_message,
              replied_status:  m.replied_status,
              reactions:       m.reactions ?? [],
            };
          }),
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, conversationId, currentUserId, playMessage, queryClient, fetchRepliedStatus, fetchRepliedMessage]);

  // ── Realtime: reactions ─────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`reactions:${conversationId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'message_reactions',
      }, (payload) => {
        const r = payload.new as MessageReaction & { message_id: string };
        setMessages((prev) => prev.map((m) => {
          if (m.id !== r.message_id) return m;
          const existing = m.reactions ?? [];
          // Replace if same user
          const filtered = existing.filter((x) => x.user_id !== r.user_id);
          return { ...m, reactions: [...filtered, { emoji: r.emoji, user_id: r.user_id }] };
        }));
      })
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'message_reactions',
      }, (payload) => {
        const r = payload.new as MessageReaction & { message_id: string };
        setMessages((prev) => prev.map((m) => {
          if (m.id !== r.message_id) return m;
          return {
            ...m,
            reactions: (m.reactions ?? []).map((x) =>
              x.user_id === r.user_id ? { ...x, emoji: r.emoji } : x,
            ),
          };
        }));
      })
      .on('postgres_changes', {
        event:  'DELETE',
        schema: 'public',
        table:  'message_reactions',
      }, (payload) => {
        const r = payload.old as MessageReaction & { message_id: string };
        setMessages((prev) => prev.map((m) => {
          if (m.id !== r.message_id) return m;
          return { ...m, reactions: (m.reactions ?? []).filter((x) => x.user_id !== r.user_id) };
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, conversationId]);

  // ── Scroll helpers ──────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Track scroll position to show/hide the scroll-to-bottom button
  useEffect(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      const near = dist < 80;
      isNearBottomRef.current = near;
      setShowScrollBtn(!near);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { scrollToBottom('instant'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Only auto-scroll when near the bottom (don't interrupt user reading history)
  useEffect(() => {
    if (isNearBottomRef.current) scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  const scrollToMessage = useCallback((msgId: string) => {
    const el = messageRefs.current.get(msgId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlighted(msgId);
    setTimeout(() => setHighlighted(null), 1500);
  }, []);

  // ── Textarea auto-resize ────────────────────────────────────
  const handleTextareaInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const newHeight = Math.min(ta.scrollHeight, 96);
    ta.style.height = `${newHeight}px`;
    ta.style.overflowY = newHeight >= 96 ? 'auto' : 'hidden';
  };

  // ── Reaction handler ────────────────────────────────────────
  const handleReactionToggle = useCallback(async (messageId: string, emoji: string) => {
    // Optimistic update
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = m.reactions ?? [];
      const mine = reactions.find((r) => r.user_id === currentUserId);
      if (mine?.emoji === emoji) {
        return { ...m, reactions: reactions.filter((r) => r.user_id !== currentUserId) };
      }
      const filtered = reactions.filter((r) => r.user_id !== currentUserId);
      return { ...m, reactions: [...filtered, { emoji, user_id: currentUserId }] };
    }));

    const result = await toggleMessageReaction(messageId, emoji);
    if (result.error) toast.error(t('reactionFailed'));
  }, [t, currentUserId]);

  // ── Delete handler ──────────────────────────────────────────
  const handleDeleteMessage = useCallback(async (messageId: string, forEveryone: boolean) => {
    // Snapshot for rollback
    let snapshot: MessageData | undefined;
    setMessages((prev) => {
      snapshot = prev.find((m) => m.id === messageId);
      return prev.map((m) => {
        if (m.id !== messageId) return m;
        if (forEveryone) {
          return { ...m, deleted_for_everyone: true, content: null, attachment_url: null, attachment_metadata: null };
        }
        return { ...m, deleted_by_user_ids: [...(m.deleted_by_user_ids ?? []), currentUserId] };
      });
    });

    const result = await deleteMessage(messageId, forEveryone);
    if (result.error) {
      toast.error(result.error);
      // Rollback to original state
      if (snapshot) {
        const original = snapshot;
        setMessages((prev) => prev.map((m) => (m.id === messageId ? original : m)));
      }
    }
  }, [currentUserId]);

  // ── Voice upload lifecycle ──────────────────────────────────

  const handlePendingVoice = useCallback((
    tempId: string, blobUrl: string, localDuration: number, cancelFn: () => void,
  ) => {
    const msg: MessageData = {
      id: tempId, sender_id: currentUserId, content: null,
      created_at: new Date().toISOString(), is_read: false, is_optimistic: true,
      message_type: 'voice', voice_url: blobUrl, voice_duration: localDuration,
      reactions: [], upload_status: 'uploading', upload_progress: 0, onCancelUpload: cancelFn,
    };
    pendingUploads.current.set(tempId, { messageType: 'voice' });
    setMessages((prev) => [...prev, msg]);
    isNearBottomRef.current = true;
  }, [currentUserId]);

  const handleVoiceProgress = useCallback((tempId: string, progress: number) => {
    setMessages((prev) =>
      prev.map((m) => m.id === tempId ? { ...m, upload_status: 'uploading', upload_progress: progress } : m),
    );
  }, []);

  const handleVoiceSent = useCallback((tempId: string, sent: SentMessage) => {
    const meta = pendingUploads.current.get(tempId);
    pendingUploads.current.delete(tempId);
    setMessages((prev) => {
      const temp = prev.find((m) => m.id === tempId);
      if (temp?.voice_url?.startsWith('blob:')) URL.revokeObjectURL(temp.voice_url);
      if (meta?.realIdFromRealtime) return prev; // realtime already replaced temp
      if (prev.some((m) => m.id === sent.id)) return prev;
      return prev.map((m) => m.id === tempId ? { ...sent as MessageData, reactions: [] } : m);
    });
  }, []);

  const handleVoiceFailed = useCallback((tempId: string, retryFn: () => void) => {
    setMessages((prev) =>
      prev.map((m) => m.id === tempId ? { ...m, upload_status: 'failed', onRetryUpload: retryFn } : m),
    );
  }, []);

  const handleVoiceCancelled = useCallback((tempId: string) => {
    pendingUploads.current.delete(tempId);
    setMessages((prev) => {
      const temp = prev.find((m) => m.id === tempId);
      if (temp?.voice_url?.startsWith('blob:')) URL.revokeObjectURL(temp.voice_url);
      return prev.filter((m) => m.id !== tempId);
    });
  }, []);

  // ── Attachment upload lifecycle ─────────────────────────────

  const handlePendingAttachment = useCallback((
    tempId: string, type: AttachmentType, info: AttachmentPreviewInfo, cancelFn: () => void,
  ) => {
    const msg: MessageData = {
      id: tempId, sender_id: currentUserId, content: null,
      created_at: new Date().toISOString(), is_read: false, is_optimistic: true,
      message_type: type,
      attachment_url: info.previewUrl ?? 'pending',
      attachment_metadata: { filename: info.filename, size: info.size, mime_type: info.mimeType },
      reactions: [], upload_status: 'uploading', upload_progress: 0,
      preview_url: info.previewUrl, onCancelUpload: cancelFn,
    };
    pendingUploads.current.set(tempId, { messageType: type });
    setMessages((prev) => [...prev, msg]);
    isNearBottomRef.current = true;
  }, [currentUserId]);

  const handleAttachmentProgress = useCallback((tempId: string, progress: number) => {
    setMessages((prev) =>
      prev.map((m) => m.id === tempId ? { ...m, upload_status: 'uploading', upload_progress: progress } : m),
    );
  }, []);

  const handleAttachmentSent = useCallback((tempId: string, sent: SentMessage) => {
    const meta = pendingUploads.current.get(tempId);
    pendingUploads.current.delete(tempId);
    setMessages((prev) => {
      const temp = prev.find((m) => m.id === tempId);
      if (temp?.preview_url?.startsWith('blob:')) URL.revokeObjectURL(temp.preview_url);
      if (meta?.realIdFromRealtime) return prev;
      if (prev.some((m) => m.id === sent.id)) return prev;
      return prev.map((m) =>
        m.id === tempId ? { ...sent as MessageData, reactions: [], preview_url: undefined } : m,
      );
    });
    isNearBottomRef.current = true;
    setReplyingTo(null);
  }, []);

  const handleAttachmentFailed = useCallback((tempId: string, retryFn: () => void) => {
    setMessages((prev) =>
      prev.map((m) => m.id === tempId ? { ...m, upload_status: 'failed', onRetryUpload: retryFn } : m),
    );
  }, []);

  const handleAttachmentCancelled = useCallback((tempId: string) => {
    pendingUploads.current.delete(tempId);
    setMessages((prev) => {
      const temp = prev.find((m) => m.id === tempId);
      if (temp?.preview_url?.startsWith('blob:')) URL.revokeObjectURL(temp.preview_url);
      return prev.filter((m) => m.id !== tempId);
    });
  }, []);

  const handleLocationSent = useCallback((sent: SentMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === sent.id)) return prev;
      return [...prev, sent as MessageData];
    });
    isNearBottomRef.current = true;
  }, []);

  // ── Send message ────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setContent('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const tempId = `temp-${Date.now()}`;
    const capturedReply = replyingTo;
    setReplyingTo(null);

    // Snapshot the original message for optimistic reply preview.
    // We do this BEFORE setMessages so we read the current state.
    const originalMsg = capturedReply ? messages.find((m) => m.id === capturedReply.id) : null;
    const capturedRepliedMsg: RepliedMessage | null = originalMsg
      ? {
          id:                   originalMsg.id,
          sender_id:            originalMsg.sender_id,
          content:              capturedReply!.content,
          message_type:         capturedReply!.messageType,
          voice_url:            originalMsg.voice_url ?? null,
          deleted_for_everyone: originalMsg.deleted_for_everyone ?? false,
        }
      : null;

    const optimisticMsg: MessageData = {
      id:                   tempId,
      sender_id:            currentUserId,
      content:              trimmed,
      created_at:           new Date().toISOString(),
      is_read:              false,
      is_optimistic:        true,
      reply_to_message_id:  capturedReply?.id ?? null,
      replied_message:      capturedRepliedMsg,
      reactions:            [],
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    isNearBottomRef.current = true; // Always scroll when user sends
    setIsSending(true);

    const result = await sendMessage(conversationId, trimmed, capturedReply?.id ?? null);
    setIsSending(false);

    if (result.error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (result.error !== 'subscription_required') {
        toast.error(t('messageSendFailed'));
        setContent(trimmed);
        if (capturedReply) setReplyingTo(capturedReply);
      }
      return;
    }

    const sent = result.data;
    if (sent) {
      // Preserve replied_message from the optimistic message: SentMessage doesn't
      // carry it (it's a client-side enrichment, not stored as a DB column).
      setMessages((prev) => prev.map((m) => {
        if (m.id !== tempId) return m;
        return { ...(sent as MessageData), replied_message: capturedRepliedMsg };
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Display messages (grouping + date dividers) ─────────────
  const displayMessages = useMemo(() => {
    const visible = messages.filter((m) => {
      if (m.deleted_for_everyone) return true; // always show the "deleted" placeholder
      if (m.deleted_by_user_ids?.includes(currentUserId)) return false;
      // backward compat: old deleted_at soft-delete (sender only)
      if (m.deleted_at && m.sender_id === currentUserId) return false;
      return true;
    });
    return visible.map((msg, i) => {
      const prev = visible[i - 1];
      const next = visible[i + 1];
      const day = msg.created_at.slice(0, 10);
      const showDate       = day !== prev?.created_at.slice(0, 10);
      const isFirstInGroup = showDate || !prev || prev.sender_id !== msg.sender_id;
      const isLastInGroup  = !next || next.sender_id !== msg.sender_id || next.created_at.slice(0, 10) !== day;
      return { ...msg, showDate, isFirstInGroup, isLastInGroup };
    });
  }, [messages, currentUserId]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="fixed inset-x-0 top-14 bottom-16 flex flex-col sm:bottom-0">

      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
        <Link href="/messages" className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-accent" aria-label={t('backAriaLabel')}>
          <ArrowRight className="h-5 w-5" />
        </Link>
        <UserAvatar user={partner} size="md" />
        <Link href={`/profile/${partner.username}`} className="min-w-0 flex-1 rounded-md px-1 transition-colors hover:bg-accent/50">
          <p className="truncate font-semibold leading-tight">{partner.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">@{partner.username}</p>
        </Link>
      </div>

      {/* Messages area + scroll-to-bottom button */}
      <div className="relative flex-1 min-h-0">
      <div
        ref={messagesAreaRef}
        className="h-full overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
        onClick={() => setActiveMsgId(null)}
      >
        {displayMessages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('startConversationNow')}</p>
          </div>
        )}

        {displayMessages.map((msg) => {
          const isSent   = msg.sender_id === currentUserId;
          const myEmoji  = (msg.reactions ?? []).find((r) => r.user_id === currentUserId)?.emoji ?? null;
          const canDelForAll =
            isSent &&
            !msg.deleted_for_everyone &&
            (Date.now() - new Date(msg.created_at).getTime()) < 60 * 60 * 1000;

          return (
            <div
              key={msg.id}
              ref={(el) => {
                if (el) messageRefs.current.set(msg.id, el);
                else messageRefs.current.delete(msg.id);
              }}
            >
              {/* Date divider */}
              {msg.showDate && (
                <div className="my-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">{getDateLabel(msg.created_at)}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              {/* Message row */}
              <div
                className={cn(
                  'flex items-end gap-1.5',
                  msg.isFirstInGroup && !msg.showDate ? 'mt-2' : 'mt-0.5',
                  isSent ? 'justify-end' : 'justify-start',
                  msg.is_optimistic && 'opacity-70',
                  highlightedId === msg.id && 'rounded-xl bg-primary/10 transition-colors duration-300',
                )}
                onMouseEnter={() => { if (!msg.is_optimistic && !msg.deleted_for_everyone) setActiveMsgId(msg.id); }}
                onMouseLeave={() => setActiveMsgId(null)}
              >
                {/* Partner avatar (received) */}
                {!isSent && (
                  <div className="w-7 shrink-0 self-end">
                    {msg.isLastInGroup && <UserAvatar user={partner} size="xs" linkable={false} />}
                  </div>
                )}

                {/* Action bar — desktop hover only, BEFORE bubble for sent */}
                {isSent && !msg.deleted_for_everyone && !msg.is_optimistic && (
                  <div className={cn(
                    'self-center shrink-0 transition-opacity duration-150',
                    'hidden md:flex',
                    activeMsgId === msg.id ? 'opacity-100' : 'opacity-0 pointer-events-none',
                  )}>
                    <MessageActionBar
                      messageId={msg.id}
                      isSent={isSent}
                      content={msg.content}
                      canDeleteForEveryone={canDelForAll}
                      currentEmoji={myEmoji}
                      onReact={(emoji) => handleReactionToggle(msg.id, emoji)}
                      onReply={() => {
                        setReplyingTo({
                          id:          msg.id,
                          content:     msg.content,
                          senderName:  t('youLabel'),
                          messageType: msg.message_type ?? 'text',
                        });
                        textareaRef.current?.focus();
                      }}
                      onCopy={() => {
                        if (msg.content) {
                          navigator.clipboard.writeText(msg.content);
                          toast.success(t('textCopied'));
                        }
                      }}
                      onDeleteForMe={() => handleDeleteMessage(msg.id, false)}
                      onDeleteForEveryone={() => handleDeleteMessage(msg.id, true)}
                    />
                  </div>
                )}

                {/* Bubble column */}
                <div
                  className={cn('flex max-w-[60%] flex-col gap-0.5', isSent ? 'items-end' : 'items-start')}
                  onContextMenu={(e) => e.preventDefault()}
                  onTouchStart={(e) => {
                    if (msg.is_optimistic || msg.deleted_for_everyone) return;
                    // Clear any existing timer (prevents multi-touch timer leak)
                    if (bubbleLongPressRef.current) {
                      clearTimeout(bubbleLongPressRef.current.timer);
                      bubbleLongPressRef.current = null;
                    }
                    const rect      = e.currentTarget.getBoundingClientRect();
                    const touch0    = e.touches[0];
                    if (!touch0) return;
                    const startPos  = { x: touch0.clientX, y: touch0.clientY };
                    bubbleLongPressRef.current = {
                      rect,
                      startPos,
                      timer: setTimeout(() => {
                        navigator.vibrate?.(50);
                        setSheetMsg({
                          id:                   msg.id,
                          isSent,
                          content:              msg.content,
                          canDeleteForEveryone: canDelForAll,
                          currentEmoji:         myEmoji,
                          anchorRect:           rect,
                        });
                        bubbleLongPressRef.current = null;
                      }, 400),
                    };
                  }}
                  onTouchEnd={() => {
                    if (bubbleLongPressRef.current) {
                      clearTimeout(bubbleLongPressRef.current.timer);
                      bubbleLongPressRef.current = null;
                    }
                  }}
                  onTouchCancel={() => {
                    if (bubbleLongPressRef.current) {
                      clearTimeout(bubbleLongPressRef.current.timer);
                      bubbleLongPressRef.current = null;
                    }
                  }}
                  onTouchMove={(e) => {
                    if (!bubbleLongPressRef.current) return;
                    const t  = e.touches[0];
                    if (!t) return;
                    const dx = Math.abs(t.clientX - bubbleLongPressRef.current.startPos.x);
                    const dy = Math.abs(t.clientY - bubbleLongPressRef.current.startPos.y);
                    if (dx > 10 || dy > 10) {
                      clearTimeout(bubbleLongPressRef.current.timer);
                      bubbleLongPressRef.current = null;
                    }
                  }}
                >

                  {/* Bubble */}
                  {(() => {
                    const isAttachment =
                      (msg.message_type === 'image' || msg.message_type === 'video' ||
                       msg.message_type === 'document' || msg.message_type === 'audio') &&
                      (!!msg.attachment_url || msg.upload_status === 'uploading');

                    if (msg.deleted_for_everyone) {
                      return (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-3.5 py-2 text-sm text-muted-foreground/60">
                          <p className="text-xs italic">{t('messageDeletedBubble')}</p>
                        </div>
                      );
                    }

                    if (isAttachment) {
                      return (
                        <div className={cn(
                          'rounded-2xl overflow-hidden',
                          isSent
                            ? 'rounded-ee-sm bg-primary text-primary-foreground'
                            : 'rounded-es-sm bg-muted text-foreground',
                          (msg.message_type === 'image' || msg.message_type === 'video')
                            ? 'p-0'
                            : 'px-3.5 py-2',
                        )}>
                          {/* Reply cards inside attachment bubble */}
                          {(msg.replied_status || msg.replied_message) && (
                            <div className="px-3.5 pt-2">
                              {msg.replied_status && (
                                <StatusReplyPreview
                                  replied_status={msg.replied_status}
                                  isSent={isSent}
                                  onClick={() => handleStatusReplyClick(
                                    msg.reply_to_status_id!,
                                    msg.replied_status!.expires_at,
                                  )}
                                  videoLabel={t('videoLabel')}
                                  imageLabel={t('imageLabel')}
                                />
                              )}
                              {msg.replied_message && !msg.replied_status && (
                                <MessageReplyPreview
                                  replied_message={msg.replied_message}
                                  senderName={msg.replied_message.sender_id === currentUserId ? t('youLabel') : partner.full_name}
                                  isSent={isSent}
                                  onClick={() => scrollToMessage(msg.reply_to_message_id!)}
                                  deletedLabel={t('deletedOriginalMessage')}
                                  voiceLabel={t('voiceMessageLabel')}
                                  attachmentLabel={t('attachmentLabel')}
                                />
                              )}
                            </div>
                          )}
                          <AttachmentBubble
                            messageType={msg.message_type as 'image' | 'video' | 'document' | 'audio'}
                            url={msg.attachment_url ?? 'pending'}
                            metadata={msg.attachment_metadata ?? {}}
                            isSent={isSent}
                            caption={msg.content}
                            uploadStatus={msg.upload_status}
                            uploadProgress={msg.upload_progress}
                            onCancelUpload={msg.onCancelUpload}
                            onRetryUpload={msg.onRetryUpload}
                            previewUrl={msg.preview_url}
                          />
                        </div>
                      );
                    }

                    if (msg.message_type === 'voice' && (msg.voice_url || msg.upload_status)) {
                      return (
                        <div className={cn(
                          'rounded-2xl px-3 py-2.5 text-sm',
                          isSent
                            ? 'rounded-ee-sm bg-primary text-primary-foreground'
                            : 'rounded-es-sm bg-muted text-foreground',
                        )}>
                          <VoiceMessageBubble
                            url={msg.voice_url ?? ''}
                            duration={msg.voice_duration ?? 0}
                            isSent={isSent}
                            uploadStatus={msg.upload_status}
                            uploadProgress={msg.upload_progress}
                            onCancelUpload={msg.onCancelUpload}
                            onRetryUpload={msg.onRetryUpload}
                          />
                        </div>
                      );
                    }

                    if (msg.message_type === 'post_share' && msg.shared_post_id) {
                      const post     = msg.shared_post_data;
                      const thumb    = post?.media?.[0]?.thumbnail ?? post?.media?.[0]?.url ?? null;
                      const isVideo  = post?.media?.[0]?.type === 'video';
                      const caption  = post?.content ?? null;
                      const author   = post?.author_full_name ?? null;

                      return (
                        <a
                          href={`/post/${msg.shared_post_id}`}
                          className={cn(
                            'flex flex-col overflow-hidden rounded-2xl border w-full max-w-[260px] sm:max-w-[300px]',
                            isSent
                              ? 'rounded-ee-sm border-primary/30 bg-primary/10'
                              : 'rounded-es-sm border-border bg-muted/50',
                          )}
                        >
                          {/* Thumbnail */}
                          {thumb ? (
                            <div className="relative aspect-video w-full overflow-hidden bg-black/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={thumb}
                                alt={caption ?? t('imageLabel')}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                                    <span className="ms-0.5 text-white text-lg">▶</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={cn(
                              'flex h-20 items-center justify-center text-3xl',
                              isSent ? 'bg-primary/15' : 'bg-muted',
                            )}>
                              📝
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex flex-col gap-1 px-3 py-2">
                            {author && (
                              <p className="text-[11px] font-semibold leading-none text-primary">
                                @{post?.author_username ?? author}
                              </p>
                            )}
                            {caption ? (
                              <p className="line-clamp-2 text-xs leading-snug text-foreground">
                                {caption}
                              </p>
                            ) : (
                              <p className="text-xs italic text-muted-foreground">
                                {t('tapToViewPost')}
                              </p>
                            )}
                          </div>
                        </a>
                      );
                    }

                    if (msg.message_type === 'location') {
                      return (
                        <LocationMessageCard
                          content={msg.content}
                          isSent={isSent}
                          senderName={isSent ? t('youLabel') : partner.full_name}
                        />
                      );
                    }

                    // Default: text message
                    return (
                      <div className={cn(
                        'rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words',
                        isSent
                          ? 'rounded-ee-sm bg-primary text-primary-foreground'
                          : 'rounded-es-sm bg-muted text-foreground',
                      )}>
                        {/* Status reply card (Session D) */}
                        {msg.replied_status && (
                          <StatusReplyPreview
                            replied_status={msg.replied_status}
                            isSent={isSent}
                            onClick={() => handleStatusReplyClick(
                              msg.reply_to_status_id!,
                              msg.replied_status!.expires_at,
                            )}
                            videoLabel={t('videoLabel')}
                            imageLabel={t('imageLabel')}
                          />
                        )}
                        {/* Message reply card (Session A) */}
                        {msg.replied_message && !msg.replied_status && (
                          <MessageReplyPreview
                            replied_message={msg.replied_message}
                            senderName={msg.replied_message.sender_id === currentUserId ? t('youLabel') : partner.full_name}
                            isSent={isSent}
                            onClick={() => scrollToMessage(msg.reply_to_message_id!)}
                            deletedLabel={t('deletedOriginalMessage')}
                            voiceLabel={t('voiceMessageLabel')}
                            attachmentLabel={t('attachmentLabel')}
                          />
                        )}
                        {msg.content}
                      </div>
                    );
                  })()}

                  {/* Reactions badge */}
                  {(msg.reactions ?? []).length > 0 && (
                    <ReactionsDisplay
                      reactions={msg.reactions!}
                      currentUserId={currentUserId}
                      currentUserAvatarUrl={currentUserAvatarUrl}
                      isSent={isSent}
                      partner={partner}
                      onToggle={(emoji) => handleReactionToggle(msg.id, emoji)}
                    />
                  )}

                  {/* Timestamp + read receipt */}
                  {msg.isLastInGroup && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{msg.is_optimistic ? '...' : formatTime(msg.created_at)}</span>
                      {isSent && !msg.is_optimistic && (
                        <span className={cn('flex items-center', msg.is_read && 'text-blue-500 dark:text-blue-400')}>
                          <Check className="-me-1.5 h-3 w-3" />
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  )}

                </div>

                {/* Action bar — desktop hover only, AFTER bubble for received */}
                {!isSent && !msg.deleted_for_everyone && !msg.is_optimistic && (
                  <div className={cn(
                    'self-center shrink-0 transition-opacity duration-150',
                    'hidden md:flex',
                    activeMsgId === msg.id ? 'opacity-100' : 'opacity-0 pointer-events-none',
                  )}>
                    <MessageActionBar
                      messageId={msg.id}
                      isSent={isSent}
                      content={msg.content}
                      canDeleteForEveryone={canDelForAll}
                      currentEmoji={myEmoji}
                      onReact={(emoji) => handleReactionToggle(msg.id, emoji)}
                      onReply={() => {
                        setReplyingTo({
                          id:          msg.id,
                          content:     msg.content,
                          senderName:  partner.full_name,
                          messageType: msg.message_type ?? 'text',
                        });
                        textareaRef.current?.focus();
                      }}
                      onCopy={() => {
                        if (msg.content) {
                          navigator.clipboard.writeText(msg.content);
                          toast.success(t('textCopied'));
                        }
                      }}
                      onDeleteForMe={() => handleDeleteMessage(msg.id, false)}
                      onDeleteForEveryone={() => handleDeleteMessage(msg.id, true)}
                    />
                  </div>
                )}
              </div>

            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          type="button"
          onClick={() => {
            isNearBottomRef.current = true;
            setShowScrollBtn(false);
            scrollToBottom('smooth');
          }}
          className="absolute bottom-4 left-0 right-0 mx-auto w-fit z-30 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-lg hover:bg-primary/90 transition-all animate-in slide-in-from-bottom-2 duration-200"
          aria-label={t('scrollToLatestAriaLabel')}
        >
          <ChevronDown className="h-3.5 w-3.5" />
          <span>{t('scrollToLatest')}</span>
        </button>
      )}
      </div>

      {/* Input area / upgrade prompt */}
      {canReply ? (
        <div className="shrink-0 border-t bg-background">
          {/* Reply preview bar */}
          {replyingTo && (
            <ReplyPreviewBar
              replyingTo={replyingTo}
              onCancel={() => setReplyingTo(null)}
            />
          )}

          <div className="flex items-end gap-2 px-4 py-3">
            {/* Attachment picker */}
            {!isVoiceRecording && (
              <AttachmentPicker
                conversationId={conversationId}
                replyToMessageId={replyingTo?.id ?? null}
                onPendingAttachment={handlePendingAttachment}
                onAttachmentProgress={handleAttachmentProgress}
                onAttachmentSent={handleAttachmentSent}
                onAttachmentFailed={handleAttachmentFailed}
                onAttachmentCancelled={handleAttachmentCancelled}
                onLocationSent={handleLocationSent}
                disabled={isSending}
              />
            )}

            {!isVoiceRecording && (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onInput={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={t('writeMessagePlaceholder')}
                rows={1}
                disabled={isSending}
                className="flex-1 resize-none rounded-2xl border bg-muted/50 px-4 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
                style={{ maxHeight: '96px', overflowY: 'hidden' }}
              />
            )}

            {content.trim() && !isVoiceRecording ? (
              <Button
                variant="brand"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={handleSend}
                disabled={!content.trim() || isSending}
                aria-label={t('sendMessageAriaLabel')}
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <VoiceRecorder
                conversationId={conversationId}
                onRecordingChange={setIsVoiceRecording}
                onPendingVoice={handlePendingVoice}
                onVoiceProgress={handleVoiceProgress}
                onVoiceSent={handleVoiceSent}
                onVoiceFailed={handleVoiceFailed}
                onVoiceCancelled={handleVoiceCancelled}
                disabled={isSending}
                className={isVoiceRecording ? 'flex-1' : ''}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="shrink-0">
          <UpgradePrompt status={subStatus?.status ?? undefined} />
        </div>
      )}

      {/* Instagram-style message action sheet (mobile only) */}
      {sheetMsg && (
        <MessageActionSheet
          active={sheetMsg}
          onClose={() => setSheetMsg(null)}
          onReact={(emoji) => handleReactionToggle(sheetMsg.id, emoji)}
          onReply={() => {
            const msg = messages.find((m) => m.id === sheetMsg.id);
            if (!msg) return;
            setReplyingTo({
              id:          msg.id,
              content:     msg.content,
              senderName:  sheetMsg.isSent ? t('youLabel') : partner.full_name,
              messageType: msg.message_type ?? 'text',
            });
            textareaRef.current?.focus();
          }}
          onCopy={() => {
            const msg = messages.find((m) => m.id === sheetMsg.id);
            if (msg?.content) {
              navigator.clipboard.writeText(msg.content);
              toast.success(t('textCopied'));
            }
          }}
          onDeleteForMe={() => handleDeleteMessage(sheetMsg.id, false)}
          onDeleteForEveryone={() => handleDeleteMessage(sheetMsg.id, true)}
        />
      )}

      {/* Status viewer (Session D) */}
      {viewerGroup && (
        <StatusViewerLazy
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          groups={[viewerGroup]}
          initialGroupIdx={0}
          currentUserId={currentUserId}
          onViewed={() => {}}
          onDeleted={() => {}}
        />
      )}
    </div>
  );
}
