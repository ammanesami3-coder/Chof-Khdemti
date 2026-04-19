"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type UploadPreset = "avatar" | "cover";

type Props = {
  type: UploadPreset;
  onUpload: (url: string) => void;
  currentUrl?: string;
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function ImageUpload({ type, onUpload, currentUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(currentUrl);

  const isAvatar = type === "avatar";

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("الملف يجب أن يكون صورة");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("الصورة أكبر من 5MB");
      return;
    }

    setUploading(true);
    try {
      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: type }),
      });

      if (!signRes.ok) throw new Error("فشل الحصول على توقيع الرفع");
      const { signature, timestamp, cloud_name, api_key, folder } =
        await signRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", String(timestamp));
      formData.append("api_key", api_key);
      formData.append("folder", folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!uploadRes.ok) throw new Error("فشل رفع الصورة");
      const { secure_url } = await uploadRes.json();

      setPreview(secure_url);
      onUpload(secure_url);
      toast.success("تم رفع الصورة بنجاح");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ أثناء الرفع");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative overflow-hidden bg-muted ${
          isAvatar
            ? "size-24 rounded-full"
            : "h-32 w-full rounded-xl"
        }`}
      >
        {preview ? (
          <Image
            src={preview}
            alt={isAvatar ? "الصورة الشخصية" : "صورة الغلاف"}
            fill
            className="object-cover"
            sizes={isAvatar ? "96px" : "100vw"}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Upload className="size-6" />
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="min-h-11 min-w-11"
      >
        {uploading ? (
          <Loader2 className="me-2 size-4 animate-spin" />
        ) : (
          <Upload className="me-2 size-4" />
        )}
        {uploading ? "جاري الرفع..." : "رفع صورة"}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
