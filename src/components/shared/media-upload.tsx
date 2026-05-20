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
import { AlertCircle, GripVertical, Loader2, Play, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadToCloudinary, type MediaItem } from "@/lib/cloudinary-upload";
import { useLang } from "@/lib/i18n/language-context";

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
  aspectClass = "aspect-square",
}: {
  item: MediaItem;
  onRemove: () => void;
  aspectClass?: string;
}) {
  const { t } = useLang();
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
      className={cn("group relative overflow-hidden rounded-xl bg-muted", aspectClass)}
    >
      <Image
        src={item.thumbnail}
        alt=""
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 50vw, 320px"
      />

      {item.type === "video" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/60 p-2.5 shadow-md">
            <Play className="size-5 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('deleteAriaLabel')}
        className="absolute end-1.5 top-1.5 rounded-full bg-black/70 p-1.5 opacity-0 shadow-md transition-all duration-200 hover:bg-red-600 group-hover:opacity-100"
      >
        <X className="size-3 text-white" />
      </button>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        aria-label={t('dragToReorderAriaLabel')}
        className="absolute bottom-1.5 start-1.5 cursor-grab rounded-lg bg-black/70 p-1.5 opacity-0 shadow-md transition-all duration-200 active:cursor-grabbing group-hover:opacity-100"
      >
        <GripVertical className="size-3 text-white" />
      </div>
    </div>
  );
}

// ── UploadingItem ─────────────────────────────────────────────────────────────

function UploadingItem({ state, aspectClass = "aspect-square" }: { state: UploadState; aspectClass?: string }) {
  const { t } = useLang();
  const isImage = IMAGE_TYPES.includes(state.file.type);

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted", aspectClass)}>
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
              {t('uploadingProgressText')} {state.progress}%
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="size-5 text-red-400" />
            <span className="text-center text-xs text-red-300">{t('uploadFailedText')}</span>
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
  const { t } = useLang();
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

  // Sync completed media up to the parent — in an effect (runs post-commit),
  // NEVER inside a setState updater. Calling the parent's setter from within a
  // state-updater function updates the parent mid-render → React's
  // "Cannot update a component while rendering a different component" error.
  useEffect(() => {
    onUploadRef.current(completedItems);
  }, [completedItems]);

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
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  function handleRemove(id: string) {
    setCompletedItems((prev) => prev.filter((i) => (i.publicId ?? i.url) !== id));
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
      setCompletedItems((prev) => [...prev, result]);
    } catch {
      setUploadStates((prev) =>
        prev.map((s) => (s.id === stateId ? { ...s, status: "error" } : s))
      );
      toast.error(`${t('uploadFailedPrefix')} ${file.name}`);

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
      toast.warning(`${t('maxFilesReachedPrefix')} (${maxFiles} ${t('filesLabel')})`);
      return;
    }

    const candidates = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(
        `${t('firstNFilesPrefix')} ${remaining} ${t('firstNFilesSuffix')} (${maxFiles})`
      );
    }

    const newStates: UploadState[] = [];

    for (const file of candidates) {
      const isImage = IMAGE_TYPES.includes(file.type);
      const isVideo = VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        toast.error(`${file.name}: ${t('fileUnsupportedSuffix')}`);
        continue;
      }
      if (isImage && file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name}: ${t('imageTooLarge10MB')}`);
        continue;
      }
      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        toast.error(`${file.name}: ${t('videoTooLarge100MB')}`);
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
  // Layout helpers
  const contentCount = completedItems.length + uploadStates.length;
  const isSingleItem = contentCount === 1;
  const canAddMore = totalCount < maxFiles;
  const gridColsClass = contentCount <= 4 ? "grid-cols-2" : "grid-cols-3";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-1.5">
      {!hasItems ? (
        /* ── Empty state: drop zone ── */
        <div
          role="button"
          tabIndex={0}
          aria-label={t('uploadFilesAriaLabel')}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(Array.from(e.dataTransfer.files));
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragEnter={() => setIsDragOver(true)}
          onDragLeave={() => setIsDragOver(false)}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 select-none",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40",
          )}
        >
          <div className={cn(
            "rounded-full p-4 transition-colors duration-200",
            isDragOver ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}>
            <Upload className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {isDragOver ? t('dropFilesHint') : t('dragFilesHint')}
            </p>
            <p className="text-xs text-muted-foreground">{t('fileTypesHint')}</p>
            <p className="text-xs text-muted-foreground">
              {t('upToLabel')} {maxFiles} {t('filesLabel')}
            </p>
          </div>
        </div>
      ) : (
        /* ── Has items: smart gallery ── */
        <div
          className={cn(
            "overflow-hidden rounded-xl border-2 transition-all duration-200",
            isDragOver ? "border-primary bg-primary/5" : "border-border dark:border-muted",
          )}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(Array.from(e.dataTransfer.files));
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragEnter={() => setIsDragOver(true)}
          onDragLeave={() => setIsDragOver(false)}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {isSingleItem ? (
              /* Single item: full-width display */
              <>
                <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
                  {completedItems.map((item) => (
                    <SortableItem
                      key={item.publicId ?? item.url}
                      item={item}
                      aspectClass="aspect-[4/3]"
                      onRemove={() => handleRemove(item.publicId ?? item.url)}
                    />
                  ))}
                </SortableContext>
                {uploadStates.map((state) => (
                  <UploadingItem key={state.id} state={state} aspectClass="aspect-[4/3]" />
                ))}
                {canAddMore && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 border-t border-border/60 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    <Plus className="size-4" />
                    {t('addMoreLabel')}
                    <span className="text-xs opacity-60">({contentCount}/{maxFiles})</span>
                  </button>
                )}
              </>
            ) : (
              /* Multiple items: smart grid */
              <div className={cn("grid gap-0.5 p-0.5", gridColsClass)}>
                <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
                  {completedItems.map((item) => (
                    <SortableItem
                      key={item.publicId ?? item.url}
                      item={item}
                      aspectClass="aspect-square"
                      onRemove={() => handleRemove(item.publicId ?? item.url)}
                    />
                  ))}
                </SortableContext>
                {uploadStates.map((state) => (
                  <UploadingItem key={state.id} state={state} aspectClass="aspect-square" />
                ))}
                {/* + Add more cell */}
                {canAddMore && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    aria-label={t('addMoreLabel')}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus className="size-6" />
                  </button>
                )}
              </div>
            )}
          </DndContext>
        </div>
      )}

      {/* Item count */}
      {hasItems && (
        <p className="text-end text-xs text-muted-foreground">
          {contentCount} / {maxFiles} {t('filesLabel')}
        </p>
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
