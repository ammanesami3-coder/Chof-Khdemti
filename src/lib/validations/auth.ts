import { z } from "zod";

export const signUpSchema = z.object({
  full_name: z
    .string()
    .min(2, "الاسم يجب أن يكون حرفين على الأقل")
    .max(100, "الاسم طويل جداً"),
  username: z
    .string()
    .min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
    .max(30, "اسم المستخدم طويل جداً")
    .regex(
      /^[a-z0-9_]+$/,
      "يقبل فقط أحرف إنجليزية صغيرة وأرقام وشرطة سفلية"
    ),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة السر يجب أن تكون 8 أحرف على الأقل"),
  account_type: z.enum(["artisan", "customer"] as const, {
    message: "يرجى اختيار نوع الحساب",
  }),
});

export const signInSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة السر مطلوبة"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
