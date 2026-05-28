'use client';

import Image from 'next/image';
import { useLang } from '@/lib/i18n/language-context';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t, dir } = useLang();

  return (
    <div
      dir={dir}
      className="relative min-h-screen overflow-hidden bg-slate-950 p-4 flex flex-col items-center justify-center"
    >
      {/* Ambient blobs — Moroccan flag colours */}
      <div className="pointer-events-none absolute -start-48 -top-48 size-[500px] rounded-full bg-red-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -end-48 size-[500px] rounded-full bg-green-600/20 blur-3xl" />

      {/* Logo + brand */}
      <div className="relative mb-8 text-center">
        <div
          className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl shadow-2xl overflow-hidden ring-2 ring-white/10"
          style={{ boxShadow: '0 8px 32px rgba(255, 159, 67, 0.35)' }}
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
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Chof Khdemti
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {t('authLayoutTagline')}
        </p>
      </div>

      {children}
    </div>
  );
}
