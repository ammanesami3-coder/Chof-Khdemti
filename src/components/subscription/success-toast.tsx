'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLang } from '@/lib/i18n/language-context';

export function SuccessToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { t } = useLang();

  useEffect(() => {
    if (params.get('success') === '1') {
      toast.success(t('subscriptionActivatingToast'), {
        duration: 6000,
      });
      // Invalidate so TrialIndicator refreshes immediately after checkout redirect
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      router.replace(pathname, { scroll: false });
    }
  }, [t, params, router, pathname, queryClient]);

  return null;
}
