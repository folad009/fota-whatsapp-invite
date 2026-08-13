"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { LANDING_SLIDES } from "@/lib/landing-slides";
import { cn } from "@/lib/cn";

export function SignInHero() {
  const [index, setIndex] = useState(0);
  const slide = LANDING_SLIDES[index]!;

  const goPrev = () => {
    setIndex((current) => (current === 0 ? LANDING_SLIDES.length - 1 : current - 1));
  };

  const goNext = () => {
    setIndex((current) => (current === LANDING_SLIDES.length - 1 ? 0 : current + 1));
  };

  return (
    <section
      className={cn(
        "relative min-h-[280px] w-full overflow-hidden lg:min-h-screen lg:w-[55%]",
        "lg:[clip-path:polygon(0_0,100%_0,92%_100%,0_100%)]"
      )}
      aria-label="Event invite showcase"
    >
      {LANDING_SLIDES.map((item, slideIndex) => (
        <div
          key={item.label}
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity duration-700",
            slideIndex === index ? "opacity-100" : "opacity-0"
          )}
          style={{ backgroundImage: `url(${item.image})` }}
          aria-hidden={slideIndex !== index}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/65" />

      <div className="relative flex h-full min-h-[280px] flex-col justify-between p-6 sm:p-8 lg:min-h-screen lg:p-10">
        <p className="text-sm font-medium tracking-wide text-white/90">
          Event Invites
        </p>

        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-sm font-semibold text-white backdrop-blur-sm">
              {slide.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-white">{slide.name}</p>
              <p className="text-sm text-white/75">{slide.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <p className="absolute bottom-24 left-6 text-xs uppercase tracking-[0.2em] text-white/60 sm:left-8 lg:bottom-28">
          {slide.label}
        </p>
      </div>
    </section>
  );
}
