'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createStatus, type StatusWithUser } from '@/lib/actions/status';

const BG_COLORS = [
  { color: '#1877F2', label: 'أزرق' },
  { color: '#E4405F', label: 'وردي' },
  { color: '#25D366', label: 'أخضر' },
  { color: '#FFC107', label: 'ذهبي' },
  { color: '#9C27B0', label: 'بنفسجي' },
  { color: '#FF5722', label: 'برتقالي' },
  { color: '#1A1A2E', label: 'داكن' },
  { color: '#FFFFFF', label: 'أبيض' },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (status: StatusWithUser) => void;
};

export function StatusComposer({ open, onOpenChange, onCreated }: Props) {
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState<string>(BG_COLORS[0].color);
  const [isPending, startTransition] = useTransition();

  const isLight = bgColor === '#FFFFFF' || bgColor === '#FFC107';
  const textColor = isLight ? '#1A1A1A' : '#FFFFFF';

  function reset() {
    setContent('');
    setBgColor(BG_COLORS[0].color);
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function handleSubmit() {
    if (!content.trim()) {
      toast.error('اكتب شيئاً في حالتك');
      return;
    }
    startTransition(async () => {
      const result = await createStatus({ content, background_color: bgColor });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        onCreated(result.data);
        toast.success('نُشرت حالتك');
        handleClose(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">إنشاء حالة</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div
          className="mx-4 mb-3 flex min-h-40 items-center justify-center rounded-2xl p-4 transition-colors duration-200"
          style={{ backgroundColor: bgColor }}
        >
          <p
            className="text-center text-lg font-semibold leading-relaxed"
            style={{ color: textColor }}
          >
            {content || 'اكتب حالتك هنا...'}
          </p>
        </div>

        {/* Textarea */}
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
          <p className="mt-1 text-end text-xs text-muted-foreground">
            {content.length}/500
          </p>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-xs text-muted-foreground">الخلفية:</span>
          <div className="flex gap-1.5">
            {BG_COLORS.map(({ color, label }) => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                aria-label={label}
                className="size-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: bgColor === color ? '#000' : 'transparent',
                  outline: bgColor === color ? '2px solid #fff' : 'none',
                  outlineOffset: '1px',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t px-4 py-3">
          <Button
            onClick={handleSubmit}
            disabled={isPending || !content.trim()}
            className="flex-1"
            size="sm"
          >
            {isPending ? 'جارٍ النشر...' : 'نشر الحالة'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
