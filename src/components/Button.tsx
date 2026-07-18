import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
  secondary: "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:ring-blue-500",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  success: "bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-500",
  ghost: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-blue-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
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
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${shared} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...rest}>
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
