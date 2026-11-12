"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface ProductMediaProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

/**
 * Renders optimized local assets with next/image, plain <img> for uploaded
 * data URLs, and a themed fallback when an image cannot be loaded.
 */
export function ProductMedia({
  src,
  alt,
  sizes,
  priority = false,
  className,
  imageClassName,
  fallbackClassName,
}: ProductMediaProps) {
  const [failed, setFailed] = useState(false);
  const isDataUrl = src.startsWith("data:");

  if (failed || !src) {
    return (
      <div
        className={cn(
          "flex size-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_35%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_68%)] text-muted-foreground",
          fallbackClassName,
        )}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="size-7 opacity-60" aria-hidden="true" />
        <span className="max-w-[70%] text-center text-xs leading-5">{alt}</span>
      </div>
    );
  }

  if (isDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- uploaded demo images are data URLs
      <img
        src={src}
        alt={alt}
        className={cn("size-full object-cover", imageClassName)}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", imageClassName, className)}
      onError={() => setFailed(true)}
    />
  );
}
