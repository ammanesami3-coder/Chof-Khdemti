import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "شروط الاستخدام — Chof Khdemti",
  description:
    "شروط استخدام منصة شوف خدمتي — المنصة وسيط تقني بين الحرفيين والزبائن.",
};

export default function TermsPage() {
  return <LegalDocument doc="terms" />;
}
