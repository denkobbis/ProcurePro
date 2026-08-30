"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SpinnerIcon } from "./icons";

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500",
  secondary: "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  success: "bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-500",
  ghost: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-brand-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
  // Landing/auth-page-only: the cyan/teal gradient CTA. Never used in the authenticated app.
  accent: "bg-gradient-to-r from-accent-600 to-accent-glow text-white shadow-lg shadow-accent-600/25 hover:opacity-90 focus-visible:ring-accent-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const shared = "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  type,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  // Safe to call outside a <form> too — React returns {pending: false, ...} by default.
  const { pending } = useFormStatus();
  const isSubmitting = type === "submit" && pending;

  return (
    <button
      type={type}
      disabled={disabled || isSubmitting}
      aria-busy={isSubmitting || undefined}
      className={`${shared} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {isSubmitting && <SpinnerIcon className="h-3.5 w-3.5 shrink-0 animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={`${shared} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </Link>
  );
}
