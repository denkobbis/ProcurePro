"use client";

import { useState } from "react";
import { SunIcon, MoonIcon } from "./icons";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  // Lazy initializer reads the class the pre-hydration inline script (in
  // layout.tsx) already set — no effect needed, and no flash, since that
  // script runs before this component ever mounts.
  const [isDark, setIsDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      // The server always renders light-mode's icon (no `document` to check
      // at SSR time); the client's lazy useState initializer immediately
      // corrects it from the pre-hydration script's class — expected,
      // harmless one-render mismatch, not worth a layout-shifting effect.
      suppressHydrationWarning
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-current transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
    >
      {isDark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
