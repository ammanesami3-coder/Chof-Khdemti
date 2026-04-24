'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

export function SuccessToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (params.get('success') === '1') {
      toast.success('شكراً! اشتراكك قيد التفعيل. قد يستغرق 30 ثانية.', {
        duration: 6000,
      });
      router.replace(pathname, { scroll: false });
    }
  }, [params, router, pathname]);

  return null;
}
