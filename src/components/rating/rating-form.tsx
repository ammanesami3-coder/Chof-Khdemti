'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from './star-rating';
import { submitRating } from '@/lib/actions/ratings';
import { useLang } from '@/lib/i18n/language-context';
import type { Rating } from '@/lib/validations/rating';

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

function makeSchema(chooseStarsError: string, maxCharsError: string) {
  return z.object({
    stars: z.number().int().min(1, chooseStarsError).max(5),
    comment: z.string().max(500, maxCharsError).optional(),
  });
}

interface RatingFormProps {
  artisanId: string;
  existingRating?: Rating;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RatingForm({ artisanId, existingRating, onSuccess, onCancel }: RatingFormProps) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const isEditing = !!existingRating;

  const schema = makeSchema(t('chooseStarsError'), t('maxCharsError'));

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      stars: existingRating?.stars ?? 0,
      comment: existingRating?.comment ?? '',
    },
  });

  // sync form if existingRating changes (e.g. dialog re-opens with different data)
  useEffect(() => {
    reset({
      stars: existingRating?.stars ?? 0,
      comment: existingRating?.comment ?? '',
    });
  }, [existingRating, reset]);

  const commentValue = watch('comment') ?? '';
  const starsValue = watch('stars');

  const { mutate, isPending } = useMutation({
    mutationFn: (values: FormValues) =>
      submitRating({ artisanId, stars: values.stars, comment: values.comment }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(isEditing ? t('ratingUpdatedToast') : t('ratingThanksToast'));
      // invalidate so ProfileHeader + RatingDisplay refresh
      queryClient.invalidateQueries({ queryKey: ['my-rating', artisanId] });
      queryClient.invalidateQueries({ queryKey: ['artisan-rating', artisanId] });
      onSuccess?.();
    },
    onError: () => toast.error(t('genericError')),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-5" noValidate>
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {isEditing ? t('editRatingTitle') : t('addRatingTitle')}
        </p>

        <Controller
          control={control}
          name="stars"
          render={({ field }) => (
            <StarRating value={field.value} onChange={field.onChange} size="lg" />
          )}
        />

        {errors.stars && (
          <p className="text-xs text-destructive">{errors.stars.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Textarea
          {...register('comment')}
          placeholder={t('ratingCommentPlaceholder')}
          rows={3}
          maxLength={500}
          className="resize-none"
          aria-label={t('ratingCommentAriaLabel')}
        />
        <div className="flex justify-between items-center">
          {errors.comment ? (
            <p className="text-xs text-destructive">{errors.comment.message}</p>
          ) : (
            <span />
          )}
          <span
            className={`text-xs tabular-nums ${
              commentValue.length >= 480 ? 'text-amber-500' : 'text-muted-foreground'
            }`}
          >
            {commentValue.length}/500
          </span>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            {t('cancelLabel')}
          </Button>
        )}
        <Button type="submit" disabled={starsValue === 0 || isPending}>
          {isPending ? t('sendingRatingProgress') : isEditing ? t('updateRatingBtn') : t('submitRatingBtn')}
        </Button>
      </div>
    </form>
  );
}
