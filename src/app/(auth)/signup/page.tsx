"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Wrench, ShoppingBag } from "lucide-react";

import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { signUp } from "@/lib/actions/auth";
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

export default function SignupPage() {
  const router = useRouter();
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

    toast.success("تم إنشاء حسابك بنجاح، مرحباً بك!");
    router.push("/feed");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">إنشاء حساب</CardTitle>
        <CardDescription>انضم إلى مجتمع الحرفيين في المغرب</CardDescription>
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
                  <FormLabel>نوع الحساب</FormLabel>
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
                        <span className="font-semibold text-sm">حرفي</span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          أنشر أعمالك واستقبل زبائن
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
                        <span className="font-semibold text-sm">زبون</span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          ابحث عن حرفيين وخدمات
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
                  <FormLabel>الاسم الكامل</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: يوسف بنعلي" {...field} />
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
                  <FormLabel>اسم المستخدم</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="youssef_benali"
                      dir="ltr"
                      className="text-start"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toLowerCase())
                      }
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
                  <FormLabel>البريد الإلكتروني</FormLabel>
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
                  <FormLabel>كلمة السر</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="8 أحرف على الأقل"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="ms-2 size-4 animate-spin" />}
              إنشاء الحساب
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            سجّل دخولك
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
