'use client';

import { useState, useRef, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { toast } from 'sonner';
import { Type, Camera, Loader2, X, Play, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createStatus } from '@/lib/actions/status';
import type { StatusWithUser } from '@/lib/types/status.types';
import { uploadToCloudinary } from '@/lib/cloudinary-upload';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const BG_OPTIONS = [
  { id: 'blue',    value: '#1877F2', label: 'أزرق' },
  { id: 'red',     value: '#DC2626', label: 'أحمر' },
  { id: 'green',   value: '#16A34A', label: 'أخضر' },
  { id: 'purple',  value: '#7C3AED', label: 'بنفسجي' },
  { id: 'orange',  value: '#EA580C', label: 'برتقالي' },
  { id: 'black',   value: '#1A1A1A', label: 'أسود' },
  { id: 'pink',    value: '#DB2777', label: 'وردي' },
  { id: 'teal',    value: '#0891B2', label: 'فيروزي' },
  { id: 'warm',    value: 'linear-gradient(135deg,#f093fb,#f5576c)', label: 'دافئ' },
  { id: 'cool',    value: 'linear-gradient(135deg,#4facfe,#00f2fe)', label: 'بارد' },
  { id: 'nature',  value: 'linear-gradient(135deg,#43e97b,#38f9d7)', label: 'طبيعة' },
  { id: 'sunset',  value: 'linear-gradient(135deg,#fa709a,#fee140)', label: 'غروب' },
] as const;

const FONT_STYLES = [
  { id: 'default', label: 'عادي',   className: 'font-sans' },
  { id: 'bold',    label: 'عريض',   className: 'font-sans font-black' },
  { id: 'serif',   label: 'كلاسيك', className: 'font-serif' },
  { id: 'mono',    label: 'كود',    className: 'font-mono' },
] as const;

type Step = 'choose' | 'text' | 'media';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (status: StatusWithUser) => void;
};

// ── Main Component ────────────────────────────────────────────────────────────

export function StatusComposer({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [isPending, startTransition] = useTransition();

  // Text state
  const [content, setContent] = useState('');
  const [bgValue, setBgValue] = useState<string>(BG_OPTIONS[0].value);
  const [fontStyle, setFontStyle] = useState<string>(FONT_STYLES[0].id);

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep('choose');
    setContent('');
    setBgValue(BG_OPTIONS[0].value);
    setFontStyle(FONT_STYLES[0].id);
    setMediaFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption('');
    setUploadProgress(0);
    setIsUploading(false);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  // Text color from bg
  const isLightBg =
    bgValue === '#FFFFFF' ||
    bgValue.includes('fee140') ||
    bgValue.includes('38f9d7') ||
    bgValue.includes('00f2fe');
  const textColor = isLightBg ? '#1A1A1A' : '#FFFFFF';
  const fontClass = FONT_STYLES.find((f) => f.id === fontStyle)?.className ?? 'font-sans';

  // ── Publish text ───────────────────────────────────────────────────────────
  function publishText() {
    if (!content.trim()) { toast.error('اكتب شيئاً'); return; }
    startTransition(async () => {
      const result = await createStatus({
        content_type: 'text',
        content,
        background_color: bgValue,
        text_color: textColor,
        font_style: fontStyle,
        duration: 5,
      });
      if (result.error) { toast.error(result.error); return; }
      if (result.data) {
        onCreated(result.data);
        toast.success('نُشرت قصتك!');
        handleClose();
      }
    });
  }

  // ── Publish media ──────────────────────────────────────────────────────────
  async function publishMedia() {
    if (!mediaFile) { toast.error('اختر ملفاً'); return; }
    setIsUploading(true);
    try {
      const isVideo = mediaFile.type.startsWith('video/');
      const preset = isVideo ? 'post_video' : 'post_image';
      const uploaded = await uploadToCloudinary(mediaFile, preset, (p) => setUploadProgress(p));

      const result = await createStatus({
        content_type: isVideo ? 'video' : 'image',
        content: caption.trim() || undefined,
        media_url: uploaded.url,
        thumbnail_url: uploaded.thumbnail,
        duration: isVideo ? 15 : 5,
      });

      if (result.error) { toast.error(result.error); return; }
      if (result.data) {
        onCreated(result.data);
        toast.success('نُشرت قصتك!');
        handleClose();
      }
    } catch {
      toast.error('فشل الرفع — حاول مرة أخرى');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setMediaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  }

  if (!open) return null;

  const modal = (
    <div
      dir="rtl"
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className={cn(
        'relative w-full bg-background shadow-2xl',
        'sm:max-w-md sm:rounded-2xl',
        'rounded-t-3xl',
        'max-h-[96dvh] overflow-hidden flex flex-col',
      )}>
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-0.5 sm:hidden">
          <div className="h-[4px] w-10 rounded-full bg-muted-foreground/25" />
        </div>

        {/* ── Step: choose ─────────────────────────────────────────────────── */}
        {step === 'choose' && (
          <>
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-base font-bold">إنشاء قصة</h2>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 px-4 pb-6">
              {/* Text story */}
              <button
                type="button"
                onClick={() => setStep('text')}
                className="group flex items-center gap-4 rounded-2xl border bg-muted/30 p-4 text-start transition-all hover:bg-muted hover:border-primary/30 active:scale-[0.98]"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <Type className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">قصة نصية</p>
                  <p className="text-xs text-muted-foreground mt-0.5">اكتب بألوان وخطوط مختلفة</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </button>

              {/* Media story */}
              <button
                type="button"
                onClick={() => {
                  setStep('media');
                  setTimeout(() => fileInputRef.current?.click(), 80);
                }}
                className="group flex items-center gap-4 rounded-2xl border bg-muted/30 p-4 text-start transition-all hover:bg-muted hover:border-green-500/30 active:scale-[0.98]"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 transition-colors group-hover:bg-green-500/15">
                  <Camera className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">صورة أو فيديو</p>
                  <p className="text-xs text-muted-foreground mt-0.5">شارك لحظة من يومك</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </button>
            </div>
          </>
        )}

        {/* ── Step: text ───────────────────────────────────────────────────── */}
        {step === 'text' && (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
              <span className="flex-1 text-sm font-semibold">قصة نصية</span>
              <Button
                size="sm"
                onClick={publishText}
                disabled={isPending || !content.trim()}
                className="h-8 gap-1.5 text-sm"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {isPending ? 'جارٍ النشر...' : 'نشر'}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Live preview */}
              <div className="px-4 pt-4 pb-3">
                <div
                  className="flex min-h-40 items-center justify-center rounded-2xl p-5 shadow-inner"
                  style={{ background: bgValue }}
                >
                  <p
                    className={cn('text-center text-xl leading-relaxed', fontClass)}
                    style={{ color: textColor }}
                  >
                    {content || (
                      <span style={{ opacity: 0.55 }}>اكتب حالتك هنا...</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Text input */}
              <div className="px-4 pb-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="ما الذي يدور في ذهنك؟"
                  maxLength={500}
                  rows={3}
                  className="resize-none text-sm"
                  dir="rtl"
                  autoFocus
                />
                <p className="mt-1 text-end text-xs text-muted-foreground">{content.length}/500</p>
              </div>

              {/* Background picker */}
              <div className="px-4 pb-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">الخلفية</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {BG_OPTIONS.map(({ id, value, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setBgValue(value)}
                      title={label}
                      className={cn(
                        'size-8 shrink-0 rounded-full shadow-sm transition-all duration-150 hover:scale-110',
                        bgValue === value && 'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background',
                      )}
                      style={{ background: value }}
                      aria-label={label}
                    />
                  ))}
                </div>
              </div>

              {/* Font picker */}
              <div className="px-4 pb-5">
                <p className="mb-2 text-xs font-medium text-muted-foreground">الخط</p>
                <div className="flex gap-1.5 flex-wrap">
                  {FONT_STYLES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontStyle(f.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition-colors',
                        fontStyle === f.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-muted',
                        f.className,
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Step: media ──────────────────────────────────────────────────── */}
        {step === 'media' && (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <button
                type="button"
                onClick={() => { reset(); setStep('choose'); }}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
              <span className="flex-1 text-sm font-semibold">قصة مرئية</span>
              {previewUrl && (
                <Button
                  size="sm"
                  onClick={publishMedia}
                  disabled={isUploading}
                  className="h-8 gap-1.5 text-sm"
                >
                  {isUploading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  {isUploading ? `${uploadProgress}%` : 'نشر'}
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-4 px-8 py-16 text-center hover:bg-muted/50 transition-colors"
                >
                  <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
                    <Camera className="size-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">انقر لاختيار ملف</p>
                    <p className="text-xs text-muted-foreground mt-1">صور وفيديوهات — حتى 25 ميغابايت</p>
                  </div>
                </button>
              ) : (
                <>
                  {/* Preview */}
                  <div className="relative mx-4 my-4 overflow-hidden rounded-2xl bg-black shadow-md" style={{ height: 220 }}>
                    {mediaFile?.type.startsWith('video/') ? (
                      <>
                        <video
                          src={previewUrl}
                          className="h-full w-full object-contain"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex size-12 items-center justify-center rounded-full bg-black/50">
                            <Play className="size-6 fill-white text-white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <Image src={previewUrl} alt="" fill className="object-contain" sizes="360px" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMediaFile(null);
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }}
                      className="absolute end-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Caption */}
                  <div className="px-4 pb-2">
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="أضف وصفاً (اختياري)"
                      maxLength={200}
                      rows={2}
                      className="resize-none text-sm"
                      dir="rtl"
                    />
                  </div>

                  {/* Upload progress */}
                  {isUploading && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                        <div className="flex-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-200"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{uploadProgress}%</span>
                      </div>
                    </div>
                  )}

                  {/* Choose different file */}
                  <div className="px-4 pb-5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-primary hover:underline"
                    >
                      اختر ملفاً آخر
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
