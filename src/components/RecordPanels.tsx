import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "./icons";

export function RecordHeader({
  backHref,
  backLabel,
  title,
  subline,
  badges,
  actions,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subline?: string;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-400">
        <ArrowLeftIcon className="h-4 w-4" />
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
            {badges}
          </div>
          {subline && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subline}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
      </div>
    </div>
  );
}

export interface StepDef {
  label: string;
  date?: string | null;
  state: "done" | "current" | "todo";
}

export function Stepper({ steps }: { steps: StepDef[] }) {
  return (
    <div
      className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-4 print:hidden dark:border-zinc-800 dark:bg-zinc-900"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((s, i) => (
        <div key={i} className="flex flex-col items-start gap-1.5">
          <div className="flex w-full items-center">
            <span
              className={`h-[11px] w-[11px] shrink-0 rounded-full border-2 ${
                s.state === "done"
                  ? "border-brand-600 bg-brand-600"
                  : s.state === "current"
                    ? "border-brand-600 bg-white ring-3 ring-brand-100 dark:bg-zinc-900 dark:ring-brand-500/20"
                    : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              }`}
            />
            {i < steps.length - 1 && <span className={`h-px flex-1 ${s.state === "done" ? "bg-brand-600" : "bg-zinc-200 dark:bg-zinc-800"}`} />}
          </div>
          <span className={`text-[12px] font-medium ${s.state === "todo" ? "text-zinc-500 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>{s.label}</span>
          {s.date && <span className="text-[11px] text-zinc-500 dark:text-zinc-500">{s.date}</span>}
        </div>
      ))}
    </div>
  );
}

export function RecordSection({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
        <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function FactsPanel({ facts }: { facts: Array<{ label: string; value: ReactNode; full?: boolean }> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {facts.map((f, i) => (
        <div key={i} className={`flex items-baseline justify-between gap-3 border-b border-zinc-100 py-2.5 first:pt-0 dark:border-zinc-800 ${f.full ? "sm:col-span-2" : ""}`}>
          <dt className="shrink-0 text-[13px] text-zinc-500 dark:text-zinc-400">{f.label}</dt>
          <dd className="text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-100">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function NotePanel({ title, tone = "default", children }: { title?: string; tone?: "default" | "warn"; children: ReactNode }) {
  return (
    <div
      className={`rounded-md px-4 py-3 text-sm ${
        tone === "warn"
          ? "border-l-[3px] border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
          : "bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {title && <div className="mb-1 font-medium">{title}</div>}
      {children}
    </div>
  );
}

export function PlatePanel({
  label,
  value,
  rows,
  footnote,
}: {
  label: string;
  value: string;
  rows: Array<{ label: string; value: string }>;
  footnote?: string;
}) {
  return (
    <div className="rounded-lg bg-brand-950 p-5">
      <div className="text-[13px] font-medium text-brand-200">{label}</div>
      <div className="mt-1 text-[40px] font-semibold leading-none tabular-nums text-white">{value}</div>
      <dl className="mt-4 space-y-1.5 text-[13px]">
        {rows.map((r, i) => (
          <div key={i} className={`flex justify-between ${i === 0 ? "border-t border-white/10 pt-1.5" : ""}`}>
            <dt className="text-brand-300">{r.label}</dt>
            <dd className="tabular-nums text-brand-100">{r.value}</dd>
          </div>
        ))}
      </dl>
      {footnote && <p className="mt-4 text-[12px] text-brand-300">{footnote}</p>}
    </div>
  );
}

export function TimelineList({ items }: { items: Array<{ title: ReactNode; meta?: string; when?: string }> }) {
  if (items.length === 0) return <p className="text-sm text-zinc-500 dark:text-zinc-500">Nothing yet.</p>;
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-zinc-900 dark:text-zinc-100">{it.title}</div>
            <div className="mt-0.5 flex gap-2 text-[12px] text-zinc-500 dark:text-zinc-500">
              {it.meta && <span>{it.meta}</span>}
              {it.when && <span>{it.when}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StatsRow({ stats }: { stats: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s, i) => (
        <div key={i} className="border-l-2 border-brand-600 pl-3">
          <div className="text-[28px] font-semibold leading-none tabular-nums text-zinc-900 dark:text-zinc-100">{s.value}</div>
          <div className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
