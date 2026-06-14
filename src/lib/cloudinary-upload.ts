export type MediaItem = {
  type: "image" | "video";
  url: string;
  thumbnail: string;
  duration?: number;
  publicId?: string;
  /** Intrinsic pixel width from Cloudinary — lets the feed reserve exact aspect (no CLS) */
  width?: number;
  /** Intrinsic pixel height from Cloudinary — lets the feed reserve exact aspect (no CLS) */
  height?: number;
};

export type AttachmentUploadResult = {
  url:           string;
  resource_type: "image" | "video" | "raw";
  filename:      string;
  size:          number;
  mime_type:     string;
  width?:        number;
  height?:       number;
  duration?:     number;
  thumbnail_url?: string;
};

/** Determines the correct Cloudinary resource_type from the file's MIME type. */
export function getResourceType(file: File): "image" | "video" | "raw" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "video"; // Cloudinary handles audio as video
  return "raw"; // PDF, DOCX, XLSX, TXT, CSV, etc.
}

type UploadPreset = "avatar" | "cover" | "post_image" | "post_video";

/**
 * Uploads a single file to Cloudinary via signed upload.
 * Uses XHR to support upload progress tracking.
 */
export async function uploadToCloudinary(
  file: File,
  preset: UploadPreset,
  onProgress?: (percent: number) => void
): Promise<MediaItem> {
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preset }),
  });

  if (!signRes.ok) throw new Error("فشل الحصول على توقيع الرفع");

  const { signature, timestamp, cloud_name, api_key, folder } =
    (await signRes.json()) as {
      signature: string;
      timestamp: number;
      cloud_name: string;
      api_key: string;
      folder: string;
    };

  const isVideo = preset === "post_video";
  const resourceType = isVideo ? "video" : "image";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", signature);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", api_key);
  formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText) as {
          public_id: string;
          secure_url: string;
          duration?: number;
          width?: number;
          height?: number;
        };

        const url = data.secure_url;
        const publicId = data.public_id;
        const duration = data.duration;
        const width = data.width;
        const height = data.height;

        // For videos: generate a thumbnail from the first frame via Cloudinary transformation
        const thumbnail = isVideo
          ? url
              .replace(
                "/video/upload/",
                "/video/upload/so_0,f_jpg,c_thumb,w_400/"
              )
              .replace(/\.\w+$/, ".jpg")
          : url;

        resolve({ type: isVideo ? "video" : "image", url, thumbnail, duration, publicId, width, height });
      } else {
        reject(new Error("فشل رفع الملف إلى Cloudinary"));
      }
    };

    xhr.onerror = () => reject(new Error("خطأ في الشبكة أثناء الرفع"));

    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`
    );
    xhr.send(formData);
  });
}

/**
 * Uploads a message attachment (image/video/document/audio) to Cloudinary.
 */
export async function uploadAttachmentToCloudinary(
  file: File,
  attachmentType: "image" | "video" | "document" | "audio",
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<AttachmentUploadResult> {
  const presetMap = {
    image:    "msg_image",
    video:    "msg_video",
    document: "msg_document",
    audio:    "msg_audio",
  } as const;

  // Determine resource_type from the actual file MIME type.
  // PDFs, DOCX, XLSX, etc. → 'raw'. Images → 'image'. Videos → 'video'.
  const resourceType = getResourceType(file);

  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preset: presetMap[attachmentType], resourceType }),
  });
  if (!signRes.ok) {
    const errBody = await signRes.text().catch(() => "");
    console.error("[uploadAttachment] sign route failed:", signRes.status, errBody);
    throw new Error(`فشل الحصول على توقيع الرفع (${signRes.status})`);
  }

  const signData = (await signRes.json()) as {
    signature: string;
    timestamp: number;
    cloud_name: string;
    api_key: string;
    folder: string;
    resource_type: string;
  };

  const { signature, timestamp, cloud_name, api_key, folder } = signData;
  // Use client-computed resourceType as the authoritative value — never trust an
  // undefined or mismatched value from the server to avoid uploading a PDF to /image/upload.
  const resource_type: string = (signData.resource_type === "image" || signData.resource_type === "video" || signData.resource_type === "raw")
    ? signData.resource_type
    : resourceType;

  if (process.env.NODE_ENV === "development") {
    console.log(`[uploadAttachment] ${file.name} → resource_type="${resource_type}" (file MIME: "${file.type}")`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", signature);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", api_key);
  formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Abort support
    if (signal) {
      if (signal.aborted) { reject(new DOMException('Upload cancelled', 'AbortError')); return; }
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload cancelled', 'AbortError'));
      }, { once: true });
    }

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText) as {
          secure_url: string;
          width?: number;
          height?: number;
          duration?: number;
        };

        const url = data.secure_url;
        let thumbnail_url: string | undefined;

        if (attachmentType === "video") {
          thumbnail_url = url
            .replace("/video/upload/", "/video/upload/so_0,f_jpg,c_thumb,w_400/")
            .replace(/\.\w+$/, ".jpg");
        } else if (attachmentType === "image") {
          thumbnail_url = url.replace("/image/upload/", "/image/upload/w_400,q_auto/");
        }

        resolve({
          url,
          resource_type: resource_type as "image" | "video" | "raw",
          filename:  file.name,
          size:      file.size,
          mime_type: file.type,
          width:     data.width,
          height:    data.height,
          duration:  data.duration ? Math.round(data.duration) : undefined,
          thumbnail_url,
        });
      } else {
        let reason = "فشل رفع الملف إلى Cloudinary";
        try {
          const err = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          if (err?.error?.message) reason += `: ${err.error.message}`;
        } catch { /* ignore parse errors */ }
        console.error(`[uploadAttachment] Cloudinary ${xhr.status}:`, xhr.responseText);
        reject(new Error(reason));
      }
    };

    xhr.onerror = () => reject(new Error("خطأ في الشبكة أثناء الرفع"));

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloud_name}/${resource_type}/upload`);
    xhr.send(formData);
  });
}

/** Deletes a file from Cloudinary by its public_id (requires server-side route). */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const res = await fetch("/api/cloudinary/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId }),
  });
  if (!res.ok) throw new Error("فشل حذف الملف");
}

/**
 * Uploads an audio Blob to Cloudinary (resource_type: video).
 * Returns the secure URL and duration (Cloudinary returns duration for audio).
 */
export async function uploadVoiceToCloudinary(
  blob: Blob,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<{ url: string; duration: number }> {
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preset: "voice_message" }),
  });
  if (!signRes.ok) throw new Error("فشل الحصول على توقيع الرفع");

  const { signature, timestamp, cloud_name, api_key, folder } =
    (await signRes.json()) as {
      signature: string;
      timestamp: number;
      cloud_name: string;
      api_key: string;
      folder: string;
    };

  // Determine extension from MIME type
  const mimeType = blob.type || "audio/webm";
  const ext = mimeType.includes("ogg")
    ? "ogg"
    : mimeType.includes("mp4")
      ? "mp4"
      : "webm";

  const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", signature);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", api_key);
  formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Abort support
    if (signal) {
      if (signal.aborted) { reject(new DOMException('Upload cancelled', 'AbortError')); return; }
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload cancelled', 'AbortError'));
      }, { once: true });
    }

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText) as {
          secure_url: string;
          duration?: number;
        };
        resolve({
          url: data.secure_url,
          duration: Math.round(data.duration ?? 0),
        });
      } else {
        reject(new Error("فشل رفع الرسالة الصوتية"));
      }
    };

    xhr.onerror = () => reject(new Error("خطأ في الشبكة أثناء الرفع"));

    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`
    );
    xhr.send(formData);
  });
}
