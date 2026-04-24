'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Send, Check } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { sendMessage, markConversationRead } from '@/lib/actions/messages';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MessageData = {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
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

function getDateLabel(isoTimestamp: string): string {
  const date = parseISO(isoTimestamp);
  if (isToday(date)) return 'اليوم';
  if (isYesterday(date)) return 'أمس';
  return format(date, 'EEEE d MMMM', { locale: ar });
}

function formatTime(isoTimestamp: string): string {
  return format(parseISO(isoTimestamp), 'HH:mm');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
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
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const { data: subStatus } = useSubscriptionStatus();
  const canReply =
    accountType !== 'artisan'
      ? true
      : subStatus !== undefined
        ? subStatus.canReply
        : initialCanReply;

  // Mark as read on mount
  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);

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
          const newMsg = payload.new as MessageData;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_id !== currentUserId) {
            markConversationRead(conversationId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, currentUserId]);

  // Scroll to bottom on mount (instant) and when messages change (smooth)
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

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    startTransition(async () => {
      const result = await sendMessage(conversationId, trimmed);
      if (result.error) {
        if (result.error !== 'subscription_required') {
          toast.error(result.error);
        }
        return;
      }
      const sent = result.data;
      if (!sent) return;
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    });
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
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={partner.avatar_url ?? undefined} alt={partner.full_name} />
          <AvatarFallback className="text-sm">{getInitials(partner.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{partner.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">@{partner.username}</p>
        </div>
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
                )}
              >
                {/* Partner avatar — only for received, last in group */}
                {!isSent && (
                  <div className="w-7 shrink-0 self-end">
                    {msg.isLastInGroup && (
                      <Avatar className="h-7 w-7">
                        <AvatarImage
                          src={partner.avatar_url ?? undefined}
                          alt={partner.full_name}
                        />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(partner.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                {/* Bubble + metadata */}
                <div className={cn('flex max-w-[75%] flex-col gap-0.5', isSent ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words',
                      isSent
                        ? 'rounded-ee-sm bg-primary text-primary-foreground'
                        : 'rounded-es-sm bg-muted text-foreground',
                    )}
                  >
                    {msg.content}
                  </div>

                  {/* Timestamp + read receipt (last in group only) */}
                  {msg.isLastInGroup && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{formatTime(msg.created_at)}</span>
                      {isSent && (
                        <span
                          className={cn(
                            'flex items-center',
                            msg.is_read && 'text-blue-400',
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
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onInput={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالة..."
              rows={1}
              disabled={isPending}
              className="flex-1 resize-none rounded-2xl border bg-muted/50 px-4 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              style={{ maxHeight: '96px', overflowY: 'auto' }}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              onClick={handleSend}
              disabled={!content.trim() || isPending}
              aria-label="إرسال الرسالة"
            >
              <Send className="h-4 w-4" />
            </Button>
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
