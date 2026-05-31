"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { signIn } from "@/lib/actions/auth";
import { useLang } from "@/lib/i18n/language-context";

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

interface LoginFormProps {
  /** Redirect path after sign-in (from ?next or middleware) */
  next?: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const { t, dir } = useLang();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: SignInInput) {
    setLoading(true);
    const result = await signIn(data);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Existing users who predate the consent checkbox must accept first.
    if (result.requiresTermsAcceptance) {
      const dest = next
        ? `/auth/accept-terms?next=${encodeURIComponent(next)}`
        : "/auth/accept-terms";
      router.push(dest);
      router.refresh();
      return;
    }

    router.push(next ?? "/feed");
    router.refresh();
  }

  // Preserve ?next when navigating to signup
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <Card className="w-full max-w-md shadow-2xl" dir={dir}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('loginTitle')}</CardTitle>
        <CardDescription>{t('loginSubtitle')}</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('passwordLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button variant="brand" type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="ms-2 size-4 animate-spin" />}
              {t('loginBtn')}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t('noAccount')}{" "}
          <Link href={signupHref} className="text-primary font-medium hover:underline">
            {t('signUpNowLink')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
