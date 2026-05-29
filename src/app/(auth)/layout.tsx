'use client';

import Image from 'next/image';
import { useLang } from '@/lib/i18n/language-context';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t, dir } = useLang();

  return (
    <div
      dir={dir}
      className="auth-animated-bg relative min-h-screen overflow-hidden p-4 flex flex-col items-center justify-center"
    >
      {/* Premium depth: soft top sheen + deeper edges for contrast */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.22), transparent 60%), radial-gradient(ellipse 90% 60% at 50% 100%, rgba(0,0,0,0.45), transparent 65%)',
        }}
      />

      {/* Floating ambient orbs */}
      <div className="auth-orb pointer-events-none absolute -start-40 -top-40 size-[460px] rounded-full bg-white/10 blur-3xl" />
      <div
        className="auth-orb pointer-events-none absolute -bottom-44 -end-40 size-[480px] rounded-full bg-white/10 blur-3xl"
        style={{ animationDelay: '-8s' }}
      />

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center">
        {/* Logo + brand */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl shadow-2xl overflow-hidden ring-2 ring-white/25"
            style={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)' }}
          >
            <Image
              src="/logo.png"
              alt="Chof Khdemti"
              width={80}
              height={80}
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
            Chof Khdemti
          </h1>
          <p className="mt-1.5 text-sm text-white/80">
            {t('authLayoutTagline')}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
