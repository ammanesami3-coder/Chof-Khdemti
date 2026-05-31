import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "سياسة الخصوصية — Chof Khdemti",
  description:
    "سياسة الخصوصية لمنصة شوف خدمتي — كيف نجمع بياناتك ونستخدمها ونحميها.",
};

export default function PrivacyPage() {
  return <LegalDocument doc="privacy" />;
}
