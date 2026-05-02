'use client';

import { useState, useRef, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Type, Camera, Loader2, X, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createStatus, type StatusWithUser } from '@/lib/actions/status';
import { uploadToCloudinary } from '@/lib/cloudinary-upload';

// ── Constants ─────────────────────────────────────────────────────────────────

const BG_OPTIONS = [
  { id: 'blue',    value: '#1877F2' },
  { id: 'red',     value: '#DC2626' },
  { id: 'green',   value: '#16A34A' },
  { id: 'purple',  value: '#7C3AED' },
  { id: 'orange',  value: '#EA580C' },
  { id: 'black',   value: '#1A1A1A' },
  { id: 'pink',    value: '#DB2777' },
  { id: 'teal',    value: '#0891B2' },
  { id: 'warm',    value: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { id: 'cool',    value: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { id: 'nature',  value: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
  { id: 'sunset',  value: 'linear-gradient(135deg,#fa709a,#fee140)' },
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

  // Text step state
  const [content, setContent] = useState('');
  const [bgValue, setBgValue] = useState<string>(BG_OPTIONS[0].value);
  const [fontStyle, setFontStyle] = useState<string>(FONT_STYLES[0].id);

  // Media step state
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

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  // Determine text color from bg
  const isLightBg = bgValue === '#FFFFFF' || bgValue.includes('#FFC') || bgValue.includes('fee140');
  const textColor = isLightBg ? '#1A1A1A' : '#FFFFFF';
  const fontClass = FONT_STYLES.find((f) => f.id === fontStyle)?.className ?? 'font-sans';

  // ── Text publish ───────────────────────────────────────────────────────────

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
      if (result.data) { onCreated(result.data); toast.success('نُشرت حالتك'); handleClose(false); }
    });
  }

  // ── Media publish ──────────────────────────────────────────────────────────

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
      if (result.data) { onCreated(result.data); toast.success('نُشرت حالتك'); handleClose(false); }
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm overflow-hidden p-0" dir="rtl">

        {/* ── Step 1: Choose type ── */}
        {step === 'choose' && (
          <>
            <DialogHeader className="px-4 pt-4 pb-3">
              <DialogTitle className="text-base">إنشاء حالة</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 px-4 pb-4">
              <button
                onClick={() => setStep('text')}
                className="flex items-center gap-3 rounded-xl border bg-muted/40 p-4 text-start transition-colors hover:bg-muted"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Type className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">نص</p>
                  <p className="text-xs text-muted-foreground">اكتب حالتك بألوان وخطوط مختلفة</p>
                </div>
              </button>
              <button
                onClick={() => { setStep('media'); setTimeout(() => fileInputRef.current?.click(), 100); }}
                className="flex items-center gap-3 rounded-xl border bg-muted/40 p-4 text-start transition-colors hover:bg-muted"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                  <Camera className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">صورة أو فيديو</p>
                  <p className="text-xs text-muted-foreground">شارك لحظة من يومك</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Step 2a: Text ── */}
        {step === 'text' && (
          <>
            {/* Back button */}
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <button onClick={() => setStep('choose')} className="p-1 hover:opacity-70">
                <X className="size-4" />
              </button>
              <span className="text-sm font-semibold">حالة نصية</span>
            </div>

            {/* Live preview */}
            <div
              className="mx-4 my-3 flex min-h-40 items-center justify-center rounded-2xl p-4"
              style={{ background: bgValue }}
            >
              <p
                className={`text-center text-xl leading-relaxed ${fontClass}`}
                style={{ color: textColor }}
              >
                {content || 'اكتب حالتك هنا...'}
              </p>
            </div>

            {/* Text input */}
            <div className="px-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="ما الذي يدور في ذهنك؟"
                maxLength={500}
                rows={3}
                className="resize-none text-sm"
                dir="rtl"
              />
              <p className="mt-1 text-end text-xs text-muted-foreground">{content.length}/500</p>
            </div>

            {/* Background colors */}
            <div className="px-4 py-2">
              <p className="mb-1.5 text-xs text-muted-foreground">الخلفية</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {BG_OPTIONS.map(({ id, value }) => (
                  <button
                    key={id}
                    onClick={() => setBgValue(value)}
                    className="size-8 shrink-0 rounded-full shadow-sm transition-transform hover:scale-110"
                    style={{
                      background: value,
                      outline: bgValue === value ? '2px solid #000' : '2px solid transparent',
                      outlineOffset: '2px',
                    }}
                    aria-label={id}
                  />
                ))}
              </div>
            </div>

            {/* Font styles */}
            <div className="px-4 pb-2">
              <p className="mb-1.5 text-xs text-muted-foreground">الخط</p>
              <div className="flex gap-1.5">
                {FONT_STYLES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontStyle(f.id)}
                    className={[
                      'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                      fontStyle === f.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted',
                      f.className,
                    ].join(' ')}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t px-4 py-3">
              <Button
                onClick={publishText}
                disabled={isPending || !content.trim()}
                className="flex-1"
                size="sm"
              >
                {isPending ? 'جارٍ النشر...' : 'نشر الحالة'}
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2b: Media ── */}
        {step === 'media' && (
          <>
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <button onClick={() => { setStep('choose'); reset(); setStep('choose'); }} className="p-1 hover:opacity-70">
                <X className="size-4" />
              </button>
              <span className="text-sm font-semibold">حالة مرئية</span>
            </div>

            {!previewUrl ? (
              <div
                className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 bg-muted/40 px-4 py-8 text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-10 text-muted-foreground" />
                <p className="text-sm font-medium">انقر لاختيار صورة أو فيديو</p>
                <p className="text-xs text-muted-foreground">JPG، PNG، MP4 — حتى 25 ميغابايت</p>
              </div>
            ) : (
              <>
                {/* Preview */}
                <div className="relative mx-4 my-3 overflow-hidden rounded-2xl bg-black" style={{ height: 220 }}>
                  {mediaFile?.type.startsWith('video/') ? (
                    <>
                      <video
                        src={previewUrl}
                        className="h-full w-full object-contain"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="size-10 fill-white/80 text-white/80 drop-shadow" />
                      </div>
                    </>
                  ) : (
                    <Image src={previewUrl} alt="" fill className="object-contain" sizes="300px" />
                  )}
                  <button
                    onClick={() => { setMediaFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                    className="absolute end-2 top-2 rounded-full bg-black/60 p-1"
                  >
                    <X className="size-4 text-white" />
                  </button>
                </div>

                {/* Caption */}
                <div className="px-4">
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
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <div className="flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 border-t px-4 py-3">
              {previewUrl ? (
                <Button
                  onClick={publishMedia}
                  disabled={isUploading}
                  className="flex-1"
                  size="sm"
                >
                  {isUploading ? 'جارٍ الرفع...' : 'نشر الحالة'}
                </Button>
              ) : (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                  size="sm"
                >
                  اختر ملفاً
                </Button>
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
      </DialogContent>
    </Dialog>
  );
}
