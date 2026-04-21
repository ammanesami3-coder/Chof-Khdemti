"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function FeedError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[feed]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <AlertTriangle className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-semibold">تعذّر تحميل الفيد</p>
        <p className="text-sm text-muted-foreground">
          حدث خطأ غير متوقع. تحقق من اتصالك ثم حاول مجدداً.
        </p>
      </div>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="size-4" aria-hidden="true" />
        إعادة المحاولة
      </Button>
    </div>
  );
}
