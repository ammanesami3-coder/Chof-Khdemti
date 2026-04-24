export const SUBSCRIPTION_PRICE_MAD = 99;
export const SUBSCRIPTION_PRICE_DISPLAY = "99 درهم/شهر";
export const TRIAL_DURATION_DAYS = 30;
export const TRIAL_WARNING_DAYS = [5, 1] as const;

export const SUBSCRIPTION_STATUS_LABELS = {
  trial: "تجربة مجانية",
  trial_ended: "انتهت التجربة",
  active: "اشتراك نشط",
  past_due: "فشل الدفع",
  cancelled: "ملغى",
} as const;
