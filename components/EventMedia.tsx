"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type Slide = {
  imageUrl: string;
};

type EventMediaProps = {
  title: string;
  mediaType?: "image" | "carousel" | "video";
  imageUrl?: string;
  carouselSlides?: Slide[];
  videoUrl?: string;
};

export function EventMedia({
  title,
  mediaType,
  imageUrl,
  carouselSlides,
  videoUrl,
}: EventMediaProps) {
  const slides = carouselSlides ?? [];
  const resolvedType =
    mediaType ??
    (videoUrl ? "video" : slides.length > 0 ? "carousel" : "image");
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];

  if (resolvedType === "video" && videoUrl) {
    return (
      <video
        src={videoUrl}
        controls
        playsInline
        className="aspect-video w-full rounded-xl bg-black object-contain sm:rounded-2xl"
        aria-label={`${title} video invite`}
      />
    );
  }

  if (resolvedType === "carousel" && slide) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted sm:rounded-2xl">
          <Image
            src={slide.imageUrl}
            alt={`${title} slide ${index + 1}`}
            fill
            className="object-contain"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            {index + 1} / {slides.length}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index >= slides.length - 1}
            onClick={() =>
              setIndex((current) => Math.min(slides.length - 1, current + 1))
            }
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  if (!imageUrl) return null;

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl sm:rounded-2xl">
      <Image
        src={imageUrl}
        alt={title}
        fill
        className="object-cover"
        priority
        sizes="(max-width: 768px) 100vw, 512px"
      />
    </div>
  );
}
