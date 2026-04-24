'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function SuccessToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (params.get('success') === '1') {
      toast.success('شكراً! اشتراكك قيد التفعيل. قد يستغرق 30 ثانية.', {
        duration: 6000,
      });
      // Invalidate so TrialIndicator refreshes immediately after checkout redirect
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      router.replace(pathname, { scroll: false });
    }
  }, [params, router, pathname, queryClient]);

  return null;
}
