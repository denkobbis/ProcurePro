"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "./useScrollReveal";

export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${visible ? "reveal-in" : ""} ${className}`} style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}>
      {children}
    </div>
  );
}
