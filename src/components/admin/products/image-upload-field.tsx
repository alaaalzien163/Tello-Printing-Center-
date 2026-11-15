"use client";

import { ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ProductMedia } from "@/components/shared/product-media";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  ImageValidationError,
  publicStorageUrl,
  validateImageFile,
} from "@/lib/storage/image-upload";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  label: string;
  hint: string;
  dropLabel: string;
  chooseLabel: string;
  replaceLabel: string;
  removeLabel: string;
  previewAlt: string;
  file: File | null;
  imagePath: string | null;
  progress?: number | null;
  disabled?: boolean;
  className?: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

function useObjectUrl(file: File | null): string {
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  return objectUrl;
}

/**
 * Shared picker, drop target and preview for product and variant images.
 * The file is validated in the browser, then handed to the parent form which
 * uploads it after the database record exists.
 */
export function ImageUploadField({
  label,
  hint,
  dropLabel,
  chooseLabel,
  replaceLabel,
  removeLabel,
  previewAlt,
  file,
  imagePath,
  progress = null,
  disabled = false,
  className,
  onSelect,
  onRemove,
}: ImageUploadFieldProps) {
  const tu = useTranslations("admin.products.upload");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const objectUrl = useObjectUrl(file);
  const preview = objectUrl || publicStorageUrl(imagePath) || "";
  const hasImage = Boolean(preview);
  const uploading = progress !== null && progress > 0 && progress < 100;

  async function acceptFile(candidate: File | undefined) {
    if (!candidate || disabled) return;

    try {
      await validateImageFile(candidate);
      onSelect(candidate);
    } catch (error) {
      const message =
        error instanceof ImageValidationError
          ? error.code === "SIZE"
            ? tu("sizeError")
            : error.code === "EXTENSION"
              ? tu("extensionError")
              : error.code === "CONTENT"
                ? tu("contentError")
                : tu("typeError")
          : tu("typeError");
      toast.error(message);
    }
  }

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-[10rem_1fr]", className)}>
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
        <ProductMedia src={preview} alt={previewAlt} sizes="160px" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={inputId}>{label}</Label>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>

        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-5 text-center transition-colors",
            dragActive && "border-primary bg-primary/5",
            disabled && "opacity-60",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!disabled) setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            void acceptFile(event.dataTransfer.files?.[0]);
          }}
        >
          <UploadCloud className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">{dropLabel}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={openPicker}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : hasImage ? (
                <RefreshCw className="size-3.5" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-3.5" aria-hidden="true" />
              )}
              {hasImage ? replaceLabel : chooseLabel}
            </Button>
            {hasImage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={onRemove}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                {removeLabel}
              </Button>
            ) : null}
          </div>
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            void acceptFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {progress !== null && progress > 0 ? (
          <div className="space-y-1" aria-live="polite">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {tu("progress", { percent: progress })}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
