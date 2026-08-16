"use client";

import { useRef } from "react";
import { ArrowRightIcon } from "@/components/icons";

export default function FeatureCarousel({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 20 : 320;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div ref={trackRef} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <div className="mt-5 hidden items-center justify-end gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Previous features"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition-colors hover:border-brand-300 hover:text-brand-600"
        >
          <ArrowRightIcon className="h-4 w-4 rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Next features"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700"
        >
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
