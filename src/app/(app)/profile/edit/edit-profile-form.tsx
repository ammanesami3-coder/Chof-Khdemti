'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectNative } from '@/components/ui/select-native';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ImageUpload } from '@/components/shared/image-upload';
import { CRAFTS } from '@/lib/constants/crafts';
import { CITIES } from '@/lib/constants/cities';
import { updateProfile } from '@/lib/actions/profile';

const schema = z.object({
  full_name: z.string().min(2, 'الاسم قصير جداً').max(100),
  bio: z.string().max(300, 'النبذة طويلة جداً').optional(),
  city: z.string().optional(),
  craft_category: z.string().optional(),
  years_experience: z
    .number({ error: 'أدخل رقماً صحيحاً' })
    .min(0)
    .max(50)
    .nullable()
    .optional(),
  avatar_url: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  defaultValues: FormValues;
  accountType: string;
  username: string;
};

export function EditProfileForm({ defaultValues, accountType, username }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const bioValue = form.watch('bio') ?? '';
  const avatarUrl = form.watch('avatar_url');
  const coverUrl = form.watch('cover_url');

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('تم تحديث ملفك الشخصي');
      router.push(`/profile/${username}`);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Cover image ─────────────────────────────────── */}
        <div>
          <p className="mb-2 text-sm font-medium">صورة الغلاف</p>
          <ImageUpload
            type="cover"
            currentUrl={coverUrl ?? undefined}
            onUpload={(url) => form.setValue('cover_url', url)}
          />
        </div>

        {/* ── Avatar ──────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-sm font-medium">الصورة الشخصية</p>
          <ImageUpload
            type="avatar"
            currentUrl={avatarUrl ?? undefined}
            onUpload={(url) => form.setValue('avatar_url', url)}
          />
        </div>

        {/* ── Full name ───────────────────────────────────── */}
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الاسم الكامل *</FormLabel>
              <FormControl>
                <Input placeholder="أدخل اسمك الكامل" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── City ────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>المدينة</FormLabel>
              <FormControl>
                <SelectNative {...field} value={field.value ?? ''}>
                  <option value="">اختر مدينتك</option>
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </SelectNative>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Craft (artisan only) ─────────────────────────── */}
        {accountType === 'artisan' && (
          <>
            <FormField
              control={form.control}
              name="craft_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>التخصص</FormLabel>
                  <FormControl>
                    <SelectNative {...field} value={field.value ?? ''}>
                      <option value="">اختر تخصصك</option>
                      {CRAFTS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name_ar}
                        </option>
                      ))}
                    </SelectNative>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="years_experience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سنوات الخبرة</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      placeholder="مثال: 5"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : e.target.valueAsNumber
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* ── Bio ─────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نبذة شخصية</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="اكتب نبذة عنك أو عن خدماتك..."
                  rows={4}
                  maxLength={300}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <div className="flex items-center justify-between mt-1">
                <FormMessage />
                <span className="text-xs text-muted-foreground ms-auto">
                  {bioValue.length}/300
                </span>
              </div>
            </FormItem>
          )}
        />

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => router.push(`/profile/${username}`)}
          >
            إلغاء
          </Button>
        </div>
      </form>
    </Form>
  );
}
