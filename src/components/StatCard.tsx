import Link from "next/link";
import type { ReactNode } from "react";

const tints: Record<string, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  green: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
  zinc: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function StatCard({
  label,
  value,
  href,
  icon,
  tint = "brand",
}: {
  label: string;
  value: string | number;
  href?: string;
  icon: ReactNode;
  tint?: keyof typeof tints;
}) {
  const content = (
    <div className="group flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${tints[tint]}`}>
        <div className="h-5 w-5">{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
