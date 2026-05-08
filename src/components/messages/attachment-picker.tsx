'use client';

import { useRef, useState } from 'react';
import { Plus, Image, Video, FileText, Music, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadAttachmentToCloudinary } from '@/lib/cloudinary-upload';
import { sendAttachmentMessage } from '@/lib/actions/messages';
import type { SentMessage, AttachmentMetadata } from '@/lib/actions/messages';

type Props = {
  conversationId: string;
  replyToMessageId?: string | null;
  onSent: (msg: SentMessage) => void;
  disabled?: boolean;
};

type AttachmentType = 'image' | 'video' | 'document' | 'audio';

const OPTIONS: { type: AttachmentType; label: string; icon: React.FC<{ className?: string }>; accept: string; color: string }[] = [
  { type: 'image',    label: 'صورة',        icon: Image,    accept: 'image/*',                                          color: 'text-blue-500'   },
  { type: 'video',    label: 'فيديو',       icon: Video,    accept: 'video/*',                                          color: 'text-purple-500' },
  { type: 'document', label: 'مستند',       icon: FileText, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv', color: 'text-orange-500' },
  { type: 'audio',    label: 'ملف صوتي',   icon: Music,    accept: 'audio/*',                                          color: 'text-green-500'  },
];

export function AttachmentPicker({ conversationId, replyToMessageId, onSent, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const fileInputRefs = useRef<Record<AttachmentType, HTMLInputElement | null>>({
    image: null, video: null, document: null, audio: null,
  });

  const handleOptionClick = (type: AttachmentType) => {
    fileInputRefs.current[type]?.click();
    setOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: AttachmentType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadAttachmentToCloudinary(file, type, setProgress);

      const metadata: AttachmentMetadata = {
        filename:      result.filename,
        size:          result.size,
        mime_type:     result.mime_type || file.type || undefined,
        width:         result.width,
        height:        result.height,
        duration:      result.duration,
        thumbnail_url: result.thumbnail_url,
      };

      const res = await sendAttachmentMessage(
        conversationId, result.url, type, metadata, null, replyToMessageId ?? null,
      );

      if ('error' in res) {
        if (res.error === 'subscription_required') {
          toast.error('يجب الاشتراك لإرسال المرفقات');
        } else {
          console.error('[AttachmentPicker] sendAttachmentMessage error:', res.error);
          toast.error(res.error || 'فشل إرسال الملف');
        }
      } else {
        onSent(res.data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل رفع الملف';
      console.error('[AttachmentPicker] upload error:', err);
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative shrink-0">
      {/* Hidden file inputs */}
      {OPTIONS.map(({ type, accept }) => (
        <input
          key={type}
          ref={(el) => { fileInputRefs.current[type] = el; }}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFileChange(e, type)}
        />
      ))}

      {/* Upload progress overlay */}
      {uploading && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted">
          <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{progress}%</span>
        </div>
      )}

      {/* + button */}
      {!uploading && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border bg-muted/60',
            'transition-colors hover:bg-accent hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-40',
            open && 'bg-accent text-foreground',
          )}
          aria-label="إرفاق ملف"
        >
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      )}

      {/* Options panel */}
      {open && !uploading && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          <div className={cn(
            'absolute bottom-full mb-2 z-40 start-0',
            'flex flex-col gap-1 rounded-2xl border bg-background p-2 shadow-lg',
            'animate-in slide-in-from-bottom-2 duration-150',
          )}>
            {OPTIONS.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleOptionClick(type)}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <Icon className={cn('h-5 w-5 shrink-0', color)} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
