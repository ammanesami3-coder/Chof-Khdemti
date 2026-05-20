'use client';

import { useState, useCallback } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  LogOut,
  Shield,
  CheckCircle,
  AlertCircle,
  Monitor,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/shared/back-button';
import { createClient } from '@/lib/supabase/client';

type Props = {
  email: string;
  lastSignIn: string | null;
};

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية'];
  const barColors = [
    '',
    'bg-red-500',
    'bg-orange-400',
    'bg-yellow-400',
    'bg-green-500',
  ];
  const textColors = [
    '',
    'text-red-500',
    'text-orange-400',
    'text-yellow-500',
    'text-green-600 dark:text-green-400',
  ];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? barColors[score] : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        قوة كلمة المرور:{' '}
        <span className={`font-semibold ${textColors[score]}`}>
          {labels[score]}
        </span>
      </p>
    </div>
  );
}

function getDeviceInfo(): {
  name: string;
  Icon: typeof Monitor;
} {
  if (typeof navigator === 'undefined')
    return { name: 'جهاز غير معروف', Icon: Monitor };
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return { name: 'iPhone / iPad', Icon: Smartphone };
  if (/Android/.test(ua)) return { name: 'هاتف Android', Icon: Smartphone };
  if (/Mac/.test(ua)) return { name: 'Mac', Icon: Monitor };
  if (/Windows/.test(ua)) return { name: 'Windows PC', Icon: Monitor };
  return { name: 'جهاز محمول', Icon: Smartphone };
}

export function AccountClient({ email, lastSignIn }: Props) {
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const { name: deviceName, Icon: DeviceIcon } = getDeviceInfo();

  const resetPasswordForm = useCallback(() => {
    setShowPasswordForm(false);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }, []);

  const handlePasswordChange = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (newPwd.length < 8) {
        toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        return;
      }
      if (newPwd !== confirmPwd) {
        toast.error('كلمتا المرور غير متطابقتين');
        return;
      }

      setIsUpdating(true);
      try {
        const supabase = createClient();

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPwd,
        });

        if (signInError) {
          toast.error('كلمة المرور الحالية غير صحيحة');
          return;
        }

        const { error } = await supabase.auth.updateUser({ password: newPwd });
        if (error) {
          toast.error('فشل تحديث كلمة المرور');
          return;
        }

        toast.success('تم تحديث كلمة المرور بنجاح 🔒');
        resetPasswordForm();
      } finally {
        setIsUpdating(false);
      }
    },
    [email, currentPwd, newPwd, confirmPwd, resetPasswordForm],
  );

  const handleSignOutAll = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
      router.push('/login');
    } finally {
      setIsSigningOut(false);
    }
  }, [router]);

  const passwordsMismatch = !!confirmPwd && newPwd !== confirmPwd;

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <BackButton fallback="/settings" />
        <h1 className="text-2xl font-bold">الحساب والأمان</h1>
      </div>

      {/* ── Email ── */}
      <section className="mb-5">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          البريد الإلكتروني
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40">
              <Mail className="size-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{email}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="size-3" />
                بريد إلكتروني موثّق
              </p>
            </div>
          </div>
          <div className="border-t border-border/40 bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              لتغيير البريد الإلكتروني، تواصل مع الدعم الفني.
            </p>
          </div>
        </div>
      </section>

      {/* ── Password ── */}
      <section className="mb-5">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          كلمة المرور
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          {!showPasswordForm ? (
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="group flex w-full items-center gap-3 px-4 py-3.5 text-start transition-all hover:bg-muted/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 transition-transform group-hover:scale-105">
                <Lock className="size-5 text-purple-600 dark:text-purple-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">تغيير كلمة المرور</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ••••••••••••
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                تغيير
              </span>
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 p-4">
              {/* Form header */}
              <div className="flex items-center justify-between">
                <p className="font-semibold">تغيير كلمة المرور</p>
                <button
                  type="button"
                  onClick={resetPasswordForm}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Current password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  كلمة المرور الحالية
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 pe-10"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 pe-10"
                    placeholder="8 أحرف على الأقل"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <PasswordStrengthBar password={newPwd} />
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-2 pe-10 ${
                      passwordsMismatch
                        ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                        : 'border-border focus:border-primary focus:ring-primary/20'
                    }`}
                    placeholder="أعد إدخال كلمة المرور"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {passwordsMismatch && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3 shrink-0" />
                    كلمتا المرور غير متطابقتين
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isUpdating || passwordsMismatch || !currentPwd || !newPwd}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    جاري التحديث...
                  </span>
                ) : (
                  'تحديث كلمة المرور'
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Sessions & Devices ── */}
      <section className="mb-5">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          الجلسات والأجهزة
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm divide-y divide-border/40">
          {/* Current device */}
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
              <DeviceIcon className="size-5 text-teal-600 dark:text-teal-400" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{deviceName}</p>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  هذا الجهاز
                </span>
              </div>
              {lastSignIn ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  آخر تسجيل دخول:{' '}
                  {formatDistanceToNow(new Date(lastSignIn), {
                    addSuffix: true,
                    locale: ar,
                  })}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  جلسة نشطة
                </p>
              )}
            </div>
            <Shield className="size-4 shrink-0 text-green-500" />
          </div>

          {/* Sign out all devices */}
          {!showSignOutConfirm ? (
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className="group flex w-full items-center gap-3 px-4 py-3.5 text-start transition-all hover:bg-muted/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 transition-transform group-hover:scale-105">
                <LogOut className="size-5 text-destructive" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-destructive">
                  تسجيل الخروج من جميع الأجهزة
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  إنهاء جميع الجلسات النشطة
                </p>
              </div>
            </button>
          ) : (
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm font-semibold">
                تسجيل الخروج من جميع الأجهزة؟
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                سيتم تسجيل خروجك من جميع الأجهزة الأخرى. ستحتاج لإعادة تسجيل
                الدخول على كل جهاز.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSignOutAll}
                  disabled={isSigningOut}
                  className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-destructive/90 disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      جاري...
                    </span>
                  ) : (
                    'تأكيد الخروج'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 rounded-xl border border-border py-2 text-sm font-medium transition-all hover:bg-muted"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
