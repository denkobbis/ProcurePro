"use client";

import { useMobileNav } from "./MobileNavContext";

export default function MobileMenuButton() {
  const { open, setOpen } = useMobileNav();

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label="Toggle navigation menu"
      className="-ml-1 rounded-md p-2 text-zinc-600 hover:bg-zinc-100 md:hidden"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 5h15M2.5 10h15M2.5 15h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
