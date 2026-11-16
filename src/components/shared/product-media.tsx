"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
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
  /**
   * Secondary source tried once before the generic placeholder. Variant images
   * use the product's main image here so a missing variant file never leaves a
   * blank card.
   */
  fallbackSrc?: string;
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
  fallbackSrc,
}: ProductMediaProps) {
  const [failedSources, setFailedSources] = useState<Record<string, boolean>>({});

  const fallback =
    fallbackSrc && fallbackSrc.trim() && fallbackSrc !== src ? fallbackSrc : "";
  const primaryFailed = failedSources[src] === true;
  const useFallback = primaryFailed && fallback !== "" && !failedSources[fallback];
  const displaySrc = useFallback ? fallback : primaryFailed ? "" : src;

  function markFailed(source: string) {
    setFailedSources((current) =>
      current[source] ? current : { ...current, [source]: true },
    );
  }

  if (!displaySrc) {
    return (
      <div
        className={cn(
          "flex size-full flex-col items-center justify-center gap-2 bg-secondary text-muted-foreground",
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

  const isPlainSource = displaySrc.startsWith("data:") || displaySrc.startsWith("blob:");

  if (isPlainSource) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data and blob preview URLs are not optimizable
      <img
        src={displaySrc}
        alt={alt}
        className={cn("size-full object-cover", imageClassName)}
        loading={priority ? "eager" : "lazy"}
        onError={() => markFailed(displaySrc)}
      />
    );
  }

  return (
    <Image
      src={displaySrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", imageClassName, className)}
      onError={() => markFailed(displaySrc)}
    />
  );
}
