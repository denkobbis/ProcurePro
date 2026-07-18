import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">{icon}</div>}
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
