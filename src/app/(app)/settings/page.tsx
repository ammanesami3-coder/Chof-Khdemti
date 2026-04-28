import { Bell, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { SoundSettings } from '@/components/settings/sound-settings';

export const metadata = { title: 'الإعدادات — Chof Khdemti' };

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">الإعدادات</h1>

      {/* Notifications section */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Bell className="size-4" />
          الإشعارات
        </h2>
        <SoundSettings />
      </section>

      {/* Subscription shortcut */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <CreditCard className="size-4" />
          الاشتراك
        </h2>
        <Link
          href="/settings/subscription"
          className={buttonVariants({ variant: 'outline' }) + ' w-full justify-start'}
        >
          إدارة الاشتراك والدفع
        </Link>
      </section>
    </main>
  );
}
