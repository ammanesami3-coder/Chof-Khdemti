'use client';

import { useState, useTransition } from 'react';
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
import { useLang } from '@/lib/i18n/language-context';

// ─── Schemas ────────────────────────────────────────────────────────────────

function makeArtisanSchema(e: {
  chooseCraft: string; chooseCity: string; validNum: string;
  minZero: string; maxFifty: string; tooShort: string; tooLong: string;
}) {
  return z.object({
    craft_category: z.string().min(1, e.chooseCraft),
    city: z.string().min(1, e.chooseCity),
    years_experience: z
      .number({ error: e.validNum })
      .min(0, e.minZero)
      .max(50, e.maxFifty),
    bio: z.string().min(10, e.tooShort).max(300, e.tooLong),
  });
}

function makeCustomerSchema(e: { chooseCity: string; tooLong: string }) {
  return z.object({
    city: z.string().min(1, e.chooseCity),
    bio: z.string().max(200, e.tooLong).optional(),
  });
}

type ArtisanValues = z.infer<ReturnType<typeof makeArtisanSchema>>;
type CustomerValues = z.infer<ReturnType<typeof makeCustomerSchema>>;

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  defaultAccountType: string | null;
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: 1 | 2 }) {
  const { t } = useLang();
  return (
    <div className="w-full mb-6">
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>{t('stepLabel')} {step} {t('stepOf')} 2</span>
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
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">{t('whoAreYou')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('chooseAccountType')}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onSelect('artisan')}
          className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border bg-card cursor-pointer transition-all duration-200 hover:border-primary hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-4xl">🔨</span>
          <div className="text-center">
            <p className="font-semibold text-base">{t('imArtisan')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('artisanDesc')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect('customer')}
          className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border bg-card cursor-pointer transition-all duration-200 hover:border-primary hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-4xl">👤</span>
          <div className="text-center">
            <p className="font-semibold text-base">{t('imCustomer')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('customerDesc')}</p>
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
  const { t } = useLang();
  const artisanSchema = makeArtisanSchema({
    chooseCraft: t('chooseCraftError'),
    chooseCity: t('chooseCityError'),
    validNum: t('enterValidNumberError'),
    minZero: t('minValueZeroError'),
    maxFifty: t('maxValueFiftyError'),
    tooShort: t('bioTooShortError'),
    tooLong: t('bioTooLongArtisanError'),
  });
  const form = useForm<ArtisanValues>({
    resolver: zodResolver(artisanSchema),
    defaultValues: { craft_category: '', city: '', years_experience: 0, bio: '' },
  });

  const bioValue = form.watch('bio') ?? '';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{t('tellUsAboutServices')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('completeProfessionalProfile')}</p>
        </div>

        <FormField
          control={form.control}
          name="craft_category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('specialtyLabel')} *</FormLabel>
              <FormControl>
                <SelectNative {...field}>
                  <option value="">{t('chooseSpecialty')}</option>
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
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('cityLabel')} *</FormLabel>
              <FormControl>
                <SelectNative {...field}>
                  <option value="">{t('chooseCity')}</option>
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

        <FormField
          control={form.control}
          name="years_experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('yearsExperienceLabel')} *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  placeholder="5"
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

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('shortBioLabel')} *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('bioPlaceholder')}
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

        <Button variant="brand" type="submit" className="w-full" disabled={isPending}>
          {isPending ? t('saving') : t('finishAndLaunch')}
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
  const { t } = useLang();
  const customerSchema = makeCustomerSchema({
    chooseCity: t('chooseCityError'),
    tooLong: t('bioTooLongCustomerError'),
  });
  const form = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { city: '', bio: '' },
  });

  const bioValue = form.watch('bio') ?? '';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{t('tellUsAboutYou')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('someInfoToStart')}</p>
        </div>

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('cityLabel')} *</FormLabel>
              <FormControl>
                <SelectNative {...field}>
                  <option value="">{t('chooseCity')}</option>
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

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('optionalBioLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('optionalBioPlaceholder')}
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

        <Button variant="brand" type="submit" className="w-full" disabled={isPending}>
          {isPending ? t('saving') : t('finishAndLaunch')}
        </Button>
      </form>
    </Form>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OnboardingForm({ defaultAccountType }: Props) {
  const { t } = useLang();
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
      toast.success(t('welcomeToast'));
      // انتقال كامل لضمان تحميل الجلسة وإبطال نسخة الزائر المخزّنة في Router Cache
      window.location.assign('/');
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-0">
        <CardTitle className="text-center text-2xl font-bold">
          {t('welcomeTitle')}
        </CardTitle>
        <CardDescription className="text-center">
          {t('completeProfileToStart')}
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
