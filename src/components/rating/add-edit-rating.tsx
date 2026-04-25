'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarRating } from './star-rating';
import { RatingForm } from './rating-form';
import { useMyRating } from '@/hooks/use-my-rating';
import type { Rating } from '@/lib/validations/rating';

interface AddEditRatingProps {
  artisanId: string;
  /** تمرير التقييم الأولي من SSR لتجنب وميض التحميل */
  initialRating: Rating | null;
  /** هل أرسل الزبون رسالة لهذا الحرفي؟ (محسوب server-side) */
  canRate: boolean;
}

export function AddEditRating({ artisanId, initialRating, canRate }: AddEditRatingProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // المصدر الحقيقي: يتحدث تلقائياً بعد الإرسال دون تحديث الصفحة
  const { data: myRating } = useMyRating(artisanId, initialRating);

  // لا شيء للزبون الذي لم يراسل بعد
  if (!canRate && !myRating) return null;

  function handleSuccess() {
    setOpen(false);
    router.refresh(); // يُعيد render قائمة التقييمات (server component)
  }

  return (
    <>
      {myRating ? (
        /* ── تقييم موجود ── */
        <div className="flex items-start justify-between gap-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/20">
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">تقييمك</p>
            <StarRating value={myRating.stars} readonly size="sm" />
            {myRating.comment && (
              <p className="text-sm text-foreground/80">{myRating.comment}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 text-amber-700 hover:text-amber-800 dark:text-amber-400"
            onClick={() => setOpen(true)}
          >
            <Pencil className="me-1 size-3.5" />
            تعديل
          </Button>
        </div>
      ) : (
        /* ── إضافة تقييم جديد ── */
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setOpen(true)}
        >
          <Star className="size-4 fill-amber-400 text-amber-400" />
          أضف تقييماً
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{myRating ? 'تعديل تقييمك' : 'أضف تقييماً'}</DialogTitle>
          </DialogHeader>
          <RatingForm
            artisanId={artisanId}
            existingRating={myRating ?? undefined}
            onSuccess={handleSuccess}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
