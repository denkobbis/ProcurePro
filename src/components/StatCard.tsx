import Link from "next/link";
import type { ReactNode } from "react";

const tints: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  green: "bg-green-50 text-green-600",
  zinc: "bg-zinc-100 text-zinc-500",
};

export default function StatCard({
  label,
  value,
  href,
  icon,
  tint = "blue",
}: {
  label: string;
  value: string | number;
  href?: string;
  icon: ReactNode;
  tint?: keyof typeof tints;
}) {
  const content = (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tints[tint]}`}>
        <div className="h-5 w-5">{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-semibold text-zinc-900">{value}</div>
        <div className="text-sm text-zinc-500">{label}</div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
