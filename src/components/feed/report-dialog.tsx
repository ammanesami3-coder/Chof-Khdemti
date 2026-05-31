"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  submitContentReport,
  type ContentReportReason,
} from "@/lib/actions/report-content";
import { useLang } from "@/lib/i18n/language-context";

type Props = {
  targetType: "post" | "comment";
  targetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const REASONS: ContentReportReason[] = [
  "spam",
  "fraud",
  "inappropriate",
  "harassment",
  "impersonation",
  "other",
];

/**
 * Reusable report modal for posts and comments. Submits into
 * public.content_reports via the submitContentReport server action.
 */
export function ReportDialog({ targetType, targetId, open, onOpenChange }: Props) {
  const { t, lang } = useLang();
  const [reason, setReason] = useState<ContentReportReason>("spam");
  const [isPending, startTransition] = useTransition();

  const labels: Record<ContentReportReason, string> = {
    spam: t("reportSpam"),
    fraud: t("reportFraud"),
    inappropriate: t("reportInappropriate"),
    harassment: t("reportHarassment"),
    impersonation: t("reportImpersonation"),
    other: t("reportOther"),
  };

  function handleSubmit() {
    if (isPending) return;
    startTransition(async () => {
      const result = await submitContentReport({ targetType, targetId, reason });
      if (result.already) {
        toast.info(t("alreadyReported"));
      } else if (result.error) {
        toast.error(result.error);
        return;
      } else {
        toast.success(t("reportSent"));
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {targetType === "post" ? t("reportPostTitle") : t("reportCommentTitle")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("reportPostDesc")}</p>
        <RadioGroup
          value={reason}
          onValueChange={(v) => setReason(v as ContentReportReason)}
          className="mt-1 space-y-2"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          {REASONS.map((value) => (
            <div
              key={value}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
            >
              <RadioGroupItem value={value} id={`report-${value}-${targetId}`} />
              <Label
                htmlFor={`report-${value}-${targetId}`}
                className="flex-1 cursor-pointer text-sm font-medium"
              >
                {labels[value]}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {isPending ? t("submittingReport") : t("submitReport")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
