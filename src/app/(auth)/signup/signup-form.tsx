"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Wrench, ShoppingBag } from "lucide-react";

import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { signUp } from "@/lib/actions/auth";
import { useLang } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SignupFormProps {
  /** محفوظ في URL لتمريره لرابط الدخول — المستخدمون الجدد يمرّون بـ Onboarding أولاً */
  next?: string;
}

export function SignupForm({ next }: SignupFormProps) {
  const { t, dir } = useLang();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      full_name: "",
      username: "",
      email: "",
      password: "",
      account_type: undefined,
    },
  });

  const accountType = form.watch("account_type");

  async function onSubmit(data: SignUpInput) {
    setLoading(true);
    const result = await signUp(data);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t('signupSuccess'));
    // المستخدم الجديد يمرّ بـ Onboarding أولاً.
    // انتقال كامل (hard navigation) بدل router.push لضمان أن السيرفر يعيد
    // التصيير بالجلسة الجديدة بدل عرض نسخة الزائر المخزّنة في Router Cache.
    window.location.assign("/onboarding");
  }

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <Card className="w-full max-w-md shadow-2xl" dir={dir}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('signupTitle')}</CardTitle>
        <CardDescription>{t('signupSubtitle')}</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* نوع الحساب */}
            <FormField
              control={form.control}
              name="account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accountTypeLabel')}</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => field.onChange("artisan")}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all",
                          accountType === "artisan"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-input hover:border-primary/50"
                        )}
                      >
                        <Wrench className="size-6" />
                        <span className="font-semibold text-sm">{t('artisan')}</span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          {t('artisanSignupDesc')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => field.onChange("customer")}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all",
                          accountType === "customer"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-input hover:border-primary/50"
                        )}
                      >
                        <ShoppingBag className="size-6" />
                        <span className="font-semibold text-sm">{t('customer')}</span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          {t('customerSignupDesc')}
                        </span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* الاسم الكامل */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fullNameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('fullNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* اسم المستخدم */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('usernameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="youssef_benali"
                      dir="ltr"
                      className="text-start"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* البريد الإلكتروني */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('emailLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      dir="ltr"
                      className="text-start"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* كلمة السر */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('passwordLabel')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('passwordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button variant="brand" type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="ms-2 size-4 animate-spin" />}
              {t('createAccountBtn')}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{" "}
          <Link href={loginHref} className="text-primary font-medium hover:underline">
            {t('signInLink')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
