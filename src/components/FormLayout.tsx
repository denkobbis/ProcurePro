import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "./icons";

export const fieldInputClass =
  "h-10 w-full rounded-md border border-zinc-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
export const fieldTextareaClass =
  "min-h-[78px] w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

const SPAN_CLASS = {
  4: "col-span-12 sm:col-span-4",
  6: "col-span-12 sm:col-span-6",
  8: "col-span-12 sm:col-span-8",
  12: "col-span-12",
} as const;

export function FormField({
  label,
  hint,
  span = 12,
  children,
}: {
  label: string;
  hint?: string;
  span?: 4 | 6 | 8 | 12;
  children: ReactNode;
}) {
  // Single-input fields (the common case) get an auto-generated id so the
  // label is properly associated; composite children (e.g. CurrencyFields,
  // NcdmbFields) already label their own internal inputs, so the injected id
  // is simply unused by them — no worse than before, strictly better for the
  // common case.
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; "aria-describedby"?: string }>, {
        id,
        "aria-describedby": hintId,
      })
    : children;

  return (
    <div className={SPAN_CLASS[span]}>
      <label htmlFor={id} className="block text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</label>
      <div className="mt-1.5">{child}</div>
      {hint && (
        <p id={hintId} className="mt-1 text-[12px] text-zinc-400 dark:text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormPanel({
  title,
  meta,
  note,
  children,
}: {
  title: string;
  meta?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {meta && <span className="shrink-0 text-[13px] text-zinc-400 dark:text-zinc-500">{meta}</span>}
      </div>
      {note && <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">{note}</p>}
      <div className="mt-4 grid grid-cols-12 gap-x-[14px] gap-y-4">{children}</div>
    </div>
  );
}

export function AsidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function FormShell({
  backHref,
  backLabel,
  title,
  description,
  form,
  aside,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  description?: string;
  form: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-400">
        <ArrowLeftIcon className="h-4 w-4" />
        {backLabel}
      </Link>
      <div>
        <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-[18px]">{form}</div>
        {aside && <div className="space-y-[18px]">{aside}</div>}
      </div>
    </div>
  );
}
