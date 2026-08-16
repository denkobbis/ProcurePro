"use client";

import { useState } from "react";
import { SunIcon, MoonIcon } from "./icons";

export default function ThemeToggle({ initialIsDark, className = "" }: { initialIsDark: boolean; className?: string }) {
  // initialIsDark comes from the server (the theme cookie, read in the page
  // component), not guessed client-side from `document` — server and client
  // render the same icon on the first pass, so there's nothing to mismatch.
  const [isDark, setIsDark] = useState(initialIsDark);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-current transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
    >
      {isDark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
