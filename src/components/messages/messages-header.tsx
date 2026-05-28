'use client';

import { useLang } from '@/lib/i18n/language-context';

export function MessagesHeader() {
  const { t } = useLang();
  return (
    <div className="border-b px-4 py-4">
      <h1 className="text-xl font-bold">{t('messagesPageTitle')}</h1>
    </div>
  );
}
