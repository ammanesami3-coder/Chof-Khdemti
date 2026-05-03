"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { AlertCircle, GripVertical, Loader2, Play, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary, type MediaItem } from "@/lib/cloudinary-upload";

export type { MediaItem };

// ── Constants ─────────────────────────────────────────────────────────────────

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

// ── Internal types ────────────────────────────────────────────────────────────

type UploadState = {
  id: string;
  file: File;
  status: "uploading" | "error";
  progress: number;
  previewUrl: string;
};

// ── SortableItem ──────────────────────────────────────────────────────────────

function SortableItem({
  item,
  onRemove,
}: {
  item: MediaItem;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.publicId ?? item.url });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
    >
      <Image
        src={item.thumbnail}
        alt=""
        fill
        className="object-cover"
        sizes="140px"
      />

      {item.type === "video" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/60 p-2.5">
            <Play className="size-4 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={onRemove}
        aria-label="حذف"
        className="absolute end-1.5 top-1.5 rounded-full bg-black/70 p-1 opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
      >
        <X className="size-3 text-white" />
      </button>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        aria-label="اسحب لإعادة الترتيب"
        className="absolute bottom-1.5 start-1.5 cursor-grab rounded p-1 opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100 bg-black/70"
      >
        <GripVertical className="size-3 text-white" />
      </div>
    </div>
  );
}

// ── UploadingItem ─────────────────────────────────────────────────────────────

function UploadingItem({ state }: { state: UploadState }) {
  const isImage = IMAGE_TYPES.includes(state.file.type);

  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.previewUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="size-8 text-muted-foreground" />
        </div>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
        {state.status === "uploading" ? (
          <>
            <Loader2 className="size-5 animate-spin text-primary" />
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-foreground">
              جاري الرفع... {state.progress}%
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="size-5 text-red-400" />
            <span className="text-center text-xs text-red-300">فشل الرفع</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── MediaUpload ───────────────────────────────────────────────────────────────

type Props = {
  maxFiles?: number;
  onUpload: (media: MediaItem[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  existingMedia?: MediaItem[];
};

export function MediaUpload({
  maxFiles = 10,
  onUpload,
  onUploadingChange,
  existingMedia,
}: Props) {
  const [completedItems, setCompletedItems] = useState<MediaItem[]>(
    existingMedia ?? []
  );
  const [uploadStates, setUploadStates] = useState<UploadState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<string[]>([]);
  // Use ref to avoid stale closure in async upload callbacks
  const onUploadRef = useRef(onUpload);
  useEffect(() => {
    onUploadRef.current = onUpload;
  });

  // Revoke all blob URLs on unmount
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => urls.forEach(URL.revokeObjectURL);
  }, []);

  // Notify parent when uploading state changes.
  // Skip the initial mount call — parent already starts with isUploading=false,
  // and calling the setter during the first render cycle triggers React 19's
  // "Cannot update a component while rendering" warning.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    onUploadingChange?.(uploadStates.some((s) => s.status === "uploading"));
  }, [uploadStates, onUploadingChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCompletedItems((prev) => {
      const activeId = String(active.id);
      const overId = String(over.id);
      const oldIdx = prev.findIndex((i) => (i.publicId ?? i.url) === activeId);
      const newIdx = prev.findIndex((i) => (i.publicId ?? i.url) === overId);
      const next = arrayMove(prev, oldIdx, newIdx);
      onUploadRef.current(next);
      return next;
    });
  }

  function handleRemove(id: string) {
    setCompletedItems((prev) => {
      const next = prev.filter((i) => (i.publicId ?? i.url) !== id);
      onUploadRef.current(next);
      return next;
    });
  }

  async function uploadFile(
    file: File,
    preset: "post_image" | "post_video",
    stateId: string
  ) {
    try {
      const result = await uploadToCloudinary(file, preset, (progress) => {
        setUploadStates((prev) =>
          prev.map((s) => (s.id === stateId ? { ...s, progress } : s))
        );
      });

      setUploadStates((prev) => prev.filter((s) => s.id !== stateId));
      setCompletedItems((prev) => {
        const next = [...prev, result];
        onUploadRef.current(next);
        return next;
      });
    } catch {
      setUploadStates((prev) =>
        prev.map((s) => (s.id === stateId ? { ...s, status: "error" } : s))
      );
      toast.error(`فشل رفع ${file.name}`);

      // Remove error item after 3 seconds
      setTimeout(() => {
        setUploadStates((prev) => prev.filter((s) => s.id !== stateId));
      }, 3000);
    }
  }

  function handleFiles(files: File[]) {
    const activeUploads = uploadStates.filter((s) => s.status === "uploading").length;
    const remaining = maxFiles - completedItems.length - activeUploads;

    if (remaining <= 0) {
      toast.warning(`وصلت الحد الأقصى (${maxFiles} ملفات)`);
      return;
    }

    const candidates = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(
        `تم اختيار أول ${remaining} ملف فقط (الحد الأقصى ${maxFiles})`
      );
    }

    const newStates: UploadState[] = [];

    for (const file of candidates) {
      const isImage = IMAGE_TYPES.includes(file.type);
      const isVideo = VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        toast.error(`${file.name}: نوع الملف غير مدعوم`);
        continue;
      }
      if (isImage && file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name}: الصورة أكبر من 10MB`);
        continue;
      }
      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        toast.error(`${file.name}: الفيديو أكبر من 100MB`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      blobUrlsRef.current.push(previewUrl);

      newStates.push({
        id: crypto.randomUUID(),
        file,
        status: "uploading",
        progress: 0,
        previewUrl,
      });
    }

    if (newStates.length === 0) return;

    setUploadStates((prev) => [...prev, ...newStates]);

    for (const state of newStates) {
      const preset = VIDEO_TYPES.includes(state.file.type)
        ? "post_video"
        : "post_image";
      uploadFile(state.file, preset, state.id);
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const activeUploadCount = uploadStates.filter(
    (s) => s.status === "uploading"
  ).length;
  const totalCount = completedItems.length + activeUploadCount;
  const hasItems = completedItems.length > 0 || uploadStates.length > 0;
  const sortedIds = completedItems.map((i) => i.publicId ?? i.url);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone — hidden once maxFiles reached */}
      {totalCount < maxFiles && (
        <div
          role="button"
          tabIndex={0}
          aria-label="رفع ملفات — انقر أو اسحب"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(Array.from(e.dataTransfer.files));
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragEnter={() => setIsDragOver(true)}
          onDragLeave={() => setIsDragOver(false)}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors select-none",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/40",
          ].join(" ")}
        >
          <div
            className={`rounded-full p-3 ${isDragOver ? "bg-primary/10" : "bg-muted"}`}
          >
            <Upload
              className={`size-6 ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragOver ? "أفلت الملفات هنا" : "اسحب الملفات هنا أو انقر للاختيار"}
            </p>
            <p className="text-xs text-muted-foreground">
              صور: JPG / PNG / WEBP ≤ 10MB &nbsp;|&nbsp; فيديو: MP4 / MOV / WEBM ≤ 100MB
            </p>
            <p className="text-xs text-muted-foreground">
              {totalCount > 0
                ? `${totalCount} / ${maxFiles} ملفات`
                : `حتى ${maxFiles} ملفات`}
            </p>
          </div>
        </div>
      )}

      {/* Preview grid */}
      {hasItems && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
              {completedItems.map((item) => (
                <SortableItem
                  key={item.publicId ?? item.url}
                  item={item}
                  onRemove={() => handleRemove(item.publicId ?? item.url)}
                />
              ))}
            </SortableContext>

            {uploadStates.map((state) => (
              <UploadingItem key={state.id} state={state} />
            ))}
          </div>
        </DndContext>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) handleFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
