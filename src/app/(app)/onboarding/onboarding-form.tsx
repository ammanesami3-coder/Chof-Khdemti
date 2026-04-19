'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { CRAFTS } from '@/lib/constants/crafts';
import { CITIES } from '@/lib/constants/cities';
import { completeOnboarding } from '@/lib/actions/onboarding';

// ─── Schemas ────────────────────────────────────────────────────────────────

const artisanSchema = z.object({
  craft_category: z.string().min(1, 'اختر تخصصك'),
  city: z.string().min(1, 'اختر مدينتك'),
  years_experience: z
    .number({ error: 'أدخل رقماً صحيحاً' })
    .min(0, 'القيمة يجب أن تكون 0 أو أكثر')
    .max(50, 'القيمة يجب أن تكون 50 أو أقل'),
  bio: z
    .string()
    .min(10, 'النبذة قصيرة جداً (10 أحرف على الأقل)')
    .max(300, 'النبذة طويلة جداً (300 حرف كحد أقصى)'),
});

const customerSchema = z.object({
  city: z.string().min(1, 'اختر مدينتك'),
  bio: z.string().max(200, 'النبذة طويلة جداً (200 حرف كحد أقصى)').optional(),
});

type ArtisanValues = z.infer<typeof artisanSchema>;
type CustomerValues = z.infer<typeof customerSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  defaultAccountType: string | null;
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="w-full mb-6">
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>الخطوة {step} من 2</span>
        <span>{step === 1 ? '50%' : '100%'}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: step === 1 ? '50%' : '100%' }}
        />
      </div>
    </div>
  );
}

// ─── Step 1: Account Type ────────────────────────────────────────────────────

function Step1({ onSelect }: { onSelect: (type: 'artisan' | 'customer') => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">من أنت؟</h2>
        <p className="text-muted-foreground text-sm mt-1">اختر نوع حسابك للمتابعة</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onSelect('artisan')}
          className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border bg-card cursor-pointer transition-all duration-200 hover:border-primary hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-4xl">🔨</span>
          <div className="text-center">
            <p className="font-semibold text-base">أنا حرفي</p>
            <p className="text-xs text-muted-foreground mt-1">أقدّم خدمات واحترف</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect('customer')}
          className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border bg-card cursor-pointer transition-all duration-200 hover:border-primary hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-4xl">👤</span>
          <div className="text-center">
            <p className="font-semibold text-base">أنا زبون</p>
            <p className="text-xs text-muted-foreground mt-1">أبحث عن خدمات</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Artisan Form ────────────────────────────────────────────────────

function ArtisanStep2({ onSubmit, isPending }: {
  onSubmit: (values: ArtisanValues) => void;
  isPending: boolean;
}) {
  const form = useForm<ArtisanValues>({
    resolver: zodResolver(artisanSchema),
    defaultValues: { craft_category: '', city: '', years_experience: 0, bio: '' },
  });

  const bioValue = form.watch('bio') ?? '';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">🔨 أخبرنا عن خدماتك</h2>
          <p className="text-muted-foreground text-sm mt-1">أكمل ملفك المهني</p>
        </div>

        {/* التخصص */}
        <FormField
          control={form.control}
          name="craft_category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>التخصص *</FormLabel>
              <FormControl>
                <SelectNative {...field}>
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

        {/* المدينة */}
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>المدينة *</FormLabel>
              <FormControl>
                <SelectNative {...field}>
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

        {/* سنوات الخبرة */}
        <FormField
          control={form.control}
          name="years_experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>سنوات الخبرة *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  placeholder="مثال: 5"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* النبذة */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نبذة مختصرة *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="اكتب نبذة عن خبرتك وخدماتك..."
                  rows={4}
                  maxLength={300}
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between items-center mt-1">
                <FormMessage />
                <span className="text-xs text-muted-foreground ms-auto">
                  {bioValue.length}/300
                </span>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'جارٍ الحفظ...' : 'إنهاء وانطلاق 🚀'}
        </Button>
      </form>
    </Form>
  );
}

// ─── Step 2: Customer Form ───────────────────────────────────────────────────

function CustomerStep2({ onSubmit, isPending }: {
  onSubmit: (values: CustomerValues) => void;
  isPending: boolean;
}) {
  const form = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { city: '', bio: '' },
  });

  const bioValue = form.watch('bio') ?? '';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">👤 أخبرنا عنك</h2>
          <p className="text-muted-foreground text-sm mt-1">بضع معلومات للبدء</p>
        </div>

        {/* المدينة */}
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>المدينة *</FormLabel>
              <FormControl>
                <SelectNative {...field}>
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

        {/* النبذة */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نبذة اختيارية</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="اكتب نبذة قصيرة عنك (اختياري)..."
                  rows={3}
                  maxLength={200}
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between items-center mt-1">
                <FormMessage />
                <span className="text-xs text-muted-foreground ms-auto">
                  {bioValue.length}/200
                </span>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'جارٍ الحفظ...' : 'إنهاء وانطلاق 🚀'}
        </Button>
      </form>
    </Form>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OnboardingForm({ defaultAccountType }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<'artisan' | 'customer' | null>(
    defaultAccountType === 'artisan' || defaultAccountType === 'customer'
      ? defaultAccountType
      : null,
  );

  function handleAccountTypeSelect(type: 'artisan' | 'customer') {
    setAccountType(type);
    setStep(2);
  }

  function handleSubmit(values: ArtisanValues | CustomerValues) {
    const input =
      accountType === 'artisan'
        ? { account_type: 'artisan' as const, ...(values as ArtisanValues) }
        : { account_type: 'customer' as const, ...(values as CustomerValues) };

    startTransition(async () => {
      const result = await completeOnboarding(input);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('أهلاً بك في Chof Khdemti! 🎉');
      router.push('/feed');
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-0">
        <CardTitle className="text-center text-2xl font-bold">
          مرحباً بك 👋
        </CardTitle>
        <CardDescription className="text-center">
          أكمل ملفك الشخصي للبدء
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ProgressBar step={step} />

        {step === 1 && (
          <Step1 onSelect={handleAccountTypeSelect} />
        )}

        {step === 2 && accountType === 'artisan' && (
          <ArtisanStep2 onSubmit={handleSubmit} isPending={isPending} />
        )}

        {step === 2 && accountType === 'customer' && (
          <CustomerStep2 onSubmit={handleSubmit} isPending={isPending} />
        )}
      </CardContent>
    </Card>
  );
}
