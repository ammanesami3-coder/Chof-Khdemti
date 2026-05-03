'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Send, Check } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { sendMessage, markConversationRead } from '@/lib/actions/messages';
import type { SentMessage } from '@/lib/actions/messages';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { useNotificationSound } from '@/hooks/use-notification-sound';
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt';
import { UserAvatar } from '@/components/shared/user-avatar';
import { VoiceRecorder } from '@/components/messages/voice-recorder';
import { VoiceMessageBubble } from '@/components/messages/voice-message-bubble';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type RepliedStatus = {
  content_type: 'text' | 'image' | 'video';
  content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  background_color: string;
  text_color: string;
  user_username: string;
  user_full_name: string;
} | null;

type MessageData = {
  id: string;
  sender_id: string;
  content: string | null;
  is_read: boolean;
  created_at: string;
  message_type?: 'text' | 'voice';
  voice_url?: string | null;
  voice_duration?: number | null;
  reply_to_status_id?: string | null;
  replied_status?: RepliedStatus;
  is_optimistic?: boolean;
};

type Partner = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  conversationId: string;
  currentUserId: string;
  accountType: string;
  partner: Partner;
  initialMessages: MessageData[];
  initialCanReply: boolean;
};

function StatusReplyPreview({
  replied_status,
  isSent,
}: {
  replied_status: NonNullable<RepliedStatus>;
  isSent: boolean;
}) {
  const hasThumb =
    replied_status.content_type !== 'text' && !!replied_status.thumbnail_url;

  return (
    <div
      className={cn(
        'mb-2 flex overflow-hidden rounded-xl text-xs',
        isSent ? 'bg-primary-foreground/20' : 'bg-black/10',
      )}
    >
      {replied_status.content_type === 'text' ? (
        <div className="w-1 shrink-0" style={{ background: replied_status.background_color }} />
      ) : hasThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={replied_status.thumbnail_url!}
          alt=""
          className="h-14 w-14 shrink-0 object-cover"
        />
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
            {replied_status.content_type === 'video' ? '🎬 فيديو' : '📷 صورة'}
          </p>
        )}
      </div>
    </div>
  );
}

function getDateLabel(isoTimestamp: string): string {
  const date = parseISO(isoTimestamp);
  if (isToday(date)) return 'اليوم';
  if (isYesterday(date)) return 'أمس';
  return format(date, 'EEEE d MMMM', { locale: ar });
}

function formatTime(isoTimestamp: string): string {
  return format(parseISO(isoTimestamp), 'HH:mm');
}

export function ChatWindow({
  conversationId,
  currentUserId,
  accountType,
  partner,
  initialMessages,
  initialCanReply,
}: Props) {
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const fetchRepliedStatusById = useCallback(async (statusId: string): Promise<RepliedStatus> => {
    const { data: st } = await supabase
      .from('status_updates')
      .select('content_type, content, media_url, thumbnail_url, background_color, text_color, user_id')
      .eq('id', statusId)
      .maybeSingle();
    if (!st) return null;
    const { data: u } = await supabase
      .from('users')
      .select('username, full_name')
      .eq('id', st.user_id)
      .maybeSingle();
    return {
      content_type: st.content_type as 'text' | 'image' | 'video',
      content: st.content ?? null,
      media_url: st.media_url ?? null,
      thumbnail_url: st.thumbnail_url ?? null,
      background_color: (st.background_color as string) ?? '#1877F2',
      text_color: (st.text_color as string) ?? '#FFFFFF',
      user_username: u?.username ?? '',
      user_full_name: u?.full_name ?? '',
    };
  }, [supabase]);

  const { data: subStatus } = useSubscriptionStatus();
  const { playMessage } = useNotificationSound();
  const queryClient = useQueryClient();

  const canReply =
    accountType !== 'artisan'
      ? true
      : subStatus !== undefined
        ? subStatus.canReply
        : initialCanReply;

  // Mark as read on mount — await the server action BEFORE invalidating the badge
  // so the refetch sees is_read = true and the count drops correctly.
  useEffect(() => {
    markConversationRead(conversationId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    });
  }, [conversationId, queryClient]);

  // Realtime: listen for new messages in this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const raw = payload.new as Omit<MessageData, 'replied_status'>;
          const newMsg: MessageData = { ...raw };

          setMessages((prev) => {
            // Replace optimistic placeholder if id matches, else append
            const tempIdx = prev.findIndex(
              (m) => m.is_optimistic && m.content === newMsg.content && m.sender_id === newMsg.sender_id,
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = newMsg;
              return next;
            }
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Enrich with replied status data asynchronously
          if (raw.reply_to_status_id) {
            fetchRepliedStatusById(raw.reply_to_status_id).then((replied_status) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === raw.id ? { ...m, replied_status } : m)),
              );
            });
          }

          if (newMsg.sender_id !== currentUserId) {
            // GlobalRealtimeProvider skips sound inside this conversation — play it here.
            playMessage();
            // Await mark-as-read before invalidating so the refetch sees is_read = true.
            markConversationRead(conversationId).then(() => {
              queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, currentUserId, playMessage, queryClient, fetchRepliedStatusById]);

  // Scroll to bottom on mount (instant) and on new messages (smooth)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('instant');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  // Textarea auto-resize (max 4 lines ≈ 96px)
  const handleTextareaInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`;
  };

  const handleVoiceSent = useCallback((msg: SentMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg as MessageData];
    });
  }, []);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    // 1. Clear input immediately
    setContent('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // 2. Add optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageData = {
      id: tempId,
      sender_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
      is_read: false,
      is_optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setIsSending(true);

    // 3. Send to server
    const result = await sendMessage(conversationId, trimmed);
    setIsSending(false);

    if (result.error) {
      // Rollback
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (result.error !== 'subscription_required') {
        toast.error('فشل إرسال الرسالة');
        setContent(trimmed); // Restore content so user can retry
      }
      return;
    }

    // 4. Replace optimistic with real message (Realtime may have already done this)
    const sent = result.data;
    if (sent) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? sent : m)),
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Compute grouping and date dividers
  const displayMessages = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const msgDay = msg.created_at.slice(0, 10);
      const showDate = msgDay !== prev?.created_at.slice(0, 10);
      const isFirstInGroup = showDate || !prev || prev.sender_id !== msg.sender_id;
      const isLastInGroup =
        !next || next.sender_id !== msg.sender_id || next.created_at.slice(0, 10) !== msgDay;
      return { ...msg, showDate, isFirstInGroup, isLastInGroup };
    });
  }, [messages]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
        <Link
          href="/messages"
          className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-accent"
          aria-label="العودة للرسائل"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <UserAvatar user={partner} size="md" />
        <Link
          href={`/profile/${partner.username}`}
          className="min-w-0 flex-1 rounded-md px-1 transition-colors hover:bg-accent/50"
        >
          <p className="truncate font-semibold leading-tight">{partner.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">@{partner.username}</p>
        </Link>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {displayMessages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">ابدأ المحادثة الآن</p>
          </div>
        )}

        {displayMessages.map((msg) => {
          const isSent = msg.sender_id === currentUserId;
          return (
            <div key={msg.id}>
              {/* Date divider */}
              {msg.showDate && (
                <div className="my-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {getDateLabel(msg.created_at)}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              {/* Message row */}
              <div
                className={cn(
                  'flex items-end gap-2',
                  msg.isFirstInGroup && !msg.showDate ? 'mt-2' : 'mt-0.5',
                  isSent ? 'justify-end' : 'justify-start',
                  msg.is_optimistic && 'opacity-70',
                )}
              >
                {/* Partner avatar — only for received, last in group */}
                {!isSent && (
                  <div className="w-7 shrink-0 self-end">
                    {msg.isLastInGroup && (
                      <UserAvatar user={partner} size="xs" linkable={false} />
                    )}
                  </div>
                )}

                {/* Bubble + metadata */}
                <div className={cn('flex max-w-[75%] flex-col gap-0.5', isSent ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'rounded-2xl text-sm leading-relaxed break-words',
                      msg.message_type === 'voice'
                        ? 'px-3 py-2.5'
                        : 'px-3.5 py-2',
                      isSent
                        ? 'rounded-ee-sm bg-primary text-primary-foreground'
                        : 'rounded-es-sm bg-muted text-foreground',
                    )}
                  >
                    {msg.message_type === 'voice' && msg.voice_url ? (
                      <VoiceMessageBubble
                        url={msg.voice_url}
                        duration={msg.voice_duration ?? 0}
                        isSent={isSent}
                      />
                    ) : (
                      <>
                        {msg.replied_status && (
                          <StatusReplyPreview replied_status={msg.replied_status} isSent={isSent} />
                        )}
                        {msg.content}
                      </>
                    )}
                  </div>

                  {/* Timestamp + read receipt (last in group only) */}
                  {msg.isLastInGroup && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{msg.is_optimistic ? '...' : formatTime(msg.created_at)}</span>
                      {isSent && !msg.is_optimistic && (
                        <span
                          className={cn(
                            'flex items-center',
                            msg.is_read && 'text-blue-500 dark:text-blue-400',
                          )}
                        >
                          <Check className="-me-1.5 h-3 w-3" />
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Spacer to balance partner avatar on sent side */}
                {isSent && <div className="w-7 shrink-0" />}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area or upgrade prompt */}
      {canReply ? (
        <div className="shrink-0 border-t bg-background px-4 py-3">
          <div className="flex items-end gap-2">
            {/* Textarea — hidden while recording to free space */}
            {!isVoiceRecording && (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onInput={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالة..."
                rows={1}
                disabled={isSending}
                className="flex-1 resize-none rounded-2xl border bg-muted/50 px-4 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                style={{ maxHeight: '96px', overflowY: 'auto' }}
              />
            )}

            {/* Send button (text present) OR VoiceRecorder (no text / recording) */}
            {content.trim() && !isVoiceRecording ? (
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={handleSend}
                disabled={!content.trim() || isSending}
                aria-label="إرسال الرسالة"
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <VoiceRecorder
                conversationId={conversationId}
                onRecordingChange={setIsVoiceRecording}
                onSent={handleVoiceSent}
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
    </div>
  );
}
