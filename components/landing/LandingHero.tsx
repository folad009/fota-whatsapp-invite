"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LANDING_SLIDES } from "@/lib/landing-slides";
import { cn } from "@/lib/cn";

export function LandingHero() {
  const [index, setIndex] = useState(0);
  const slide = LANDING_SLIDES[index]!;

  const goPrev = () => {
    setIndex((current) =>
      current === 0 ? LANDING_SLIDES.length - 1 : current - 1
    );
  };

  const goNext = () => {
    setIndex((current) =>
      current === LANDING_SLIDES.length - 1 ? 0 : current + 1
    );
  };

  return (
    <section className="relative overflow-hidden" aria-label="Hero">
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

      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-primary/30" />

      <div className="relative mx-auto flex min-h-[85vh] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6 lg:min-h-[90vh] lg:py-28">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            Built for event organizers
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Send event invites on WhatsApp
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
            Create events, send beautiful image invites, collect registrations,
            and confirm attendance — all in one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/sign-in">
              <Button size="lg" className="h-12 rounded-xl px-8 text-base">
                Sign in to dashboard
              </Button>
            </Link>
           
          </div>
        </div>

        <div className="mt-12 flex items-end justify-between gap-4 lg:mt-16">
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

        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/50">
          {slide.label}
        </p>
      </div>
    </section>
  );
}
