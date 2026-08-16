// Hand-built illustrated UI mockups for the landing page's feature grid —
// designed representations of real ProcurePro screens (real labels, real
// figures from the live product), not screenshots. Each sits inside
// MockupFrame's soft gradient backdrop, styled as a lightweight "window"
// (three muted dots, no traffic-light chrome) so it reads as an illustration
// of the product rather than the product itself.
import type { ReactNode } from "react";

export function MockupFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex aspect-[16/12.5] w-full items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br from-brand-50 via-accent-50 to-white p-5">
      {children}
    </div>
  );
}

export function FloatingBadge({
  children,
  position = "top-right",
  tone = "accent",
}: {
  children: ReactNode;
  position?: "top-right" | "bottom-left" | "top-left";
  tone?: "accent" | "brand" | "amber";
}) {
  const posClass = {
    "top-right": "-right-2 -top-3 sm:-right-3",
    "bottom-left": "-left-2 -bottom-3 sm:-left-3",
    "top-left": "-left-2 -top-3 sm:-left-3",
  }[position];
  const toneClass = {
    accent: "bg-gradient-to-r from-accent-600 to-accent-glow text-white",
    brand: "bg-brand-700 text-white",
    amber: "bg-amber-500 text-white",
  }[tone];
  return (
    <div className={`animate-drift absolute z-10 rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg ${posClass} ${toneClass}`}>
      {children}
    </div>
  );
}

function WindowDots() {
  return (
    <div className="mb-2.5 flex gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
    </div>
  );
}

export interface Row {
  label: string;
  sub?: string;
  value?: string;
  flagged?: boolean;
  barPercent?: number;
}

export function ListRowsCard({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="w-full max-w-[290px] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
      <WindowDots />
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{title}</div>
      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className={`rounded-lg border p-2 ${row.flagged ? "border-amber-200 bg-amber-50" : "border-zinc-100 bg-zinc-50/60"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] font-medium text-zinc-800">{row.label}</span>
              {row.value && <span className={`shrink-0 text-[11px] font-semibold ${row.flagged ? "text-amber-700" : "text-zinc-500"}`}>{row.value}</span>}
            </div>
            {row.sub && <div className={`mt-0.5 text-[10.5px] ${row.flagged ? "text-amber-700" : "text-zinc-400"}`}>{row.sub}</div>}
            {row.barPercent !== undefined && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-200">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${row.barPercent}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatPlateCard({
  label,
  value,
  rows,
}: {
  label: string;
  value: string;
  rows: { label: string; value: string; strike?: boolean }[];
}) {
  return (
    <div className="w-full max-w-[290px] rounded-xl bg-brand-950 p-4 text-white shadow-xl">
      <div className="text-[11px] font-medium text-brand-300">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-[11px]">
            <span className="text-brand-300">{r.label}</span>
            <span className={r.strike ? "text-brand-400 line-through" : "font-medium text-white"}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompareCard({
  options,
}: {
  options: { label: string; price: string; detail: string; recommended?: boolean }[];
}) {
  return (
    <div className="flex w-full max-w-[300px] flex-col gap-2">
      {options.map((o) => (
        <div
          key={o.label}
          className={`relative rounded-lg border p-2.5 shadow-md ${o.recommended ? "border-accent-300 bg-accent-50" : "border-zinc-200 bg-white"}`}
        >
          {o.recommended && (
            <span className="absolute -top-2 right-2 rounded-full bg-gradient-to-r from-accent-600 to-accent-glow px-2 py-0.5 text-[9px] font-semibold text-white">
              Recommended
            </span>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-zinc-800">{o.label}</span>
            <span className="text-[12px] font-semibold text-zinc-900">{o.price}</span>
          </div>
          <div className="mt-0.5 text-[10.5px] text-zinc-500">{o.detail}</div>
        </div>
      ))}
    </div>
  );
}

export function ChatExtractCard({ fields }: { fields: { label: string; value: string }[] }) {
  return (
    <div className="w-full max-w-[290px] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
      <WindowDots />
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-accent-300 bg-accent-50/60 px-2.5 py-2 text-[11px] font-medium text-accent-700">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white">↑</span>
        vendor-invoice.pdf
      </div>
      <div className="my-2 flex justify-center text-zinc-300">↓</div>
      <div className="flex flex-wrap gap-1.5">
        {fields.map((f) => (
          <div key={f.label} className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10.5px]">
            <span className="text-zinc-400">{f.label}: </span>
            <span className="font-medium text-zinc-800">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RuleTableCard({ rows }: { rows: { dept: string; range: string; step: string; role: string }[] }) {
  return (
    <div className="w-full max-w-[300px] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
      <WindowDots />
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Approval rules</div>
      <div className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <div key={r.dept} className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-zinc-800">{r.dept}</span>
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-brand-700">Step {r.step}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[10.5px] text-zinc-500">
              <span>{r.range}</span>
              <span>{r.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroDashboardCard() {
  const stats: { value: string; label: string; tone?: "amber" }[] = [
    { value: "0", label: "Drafted" },
    { value: "8", label: "Awaiting approval", tone: "amber" },
    { value: "4", label: "Open POs" },
    { value: "0", label: "Receiving" },
  ];
  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl shadow-black/30">
      <WindowDots />
      <div className="text-[15px] font-semibold text-zinc-900">Today</div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2 text-center">
            <div className={`text-lg font-semibold ${s.tone === "amber" ? "text-amber-600" : "text-zinc-900"}`}>{s.value}</div>
            <div className="mt-0.5 text-[9px] leading-tight text-zinc-400">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
        <div className="rounded-lg border border-accent-200 bg-accent-50/50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-zinc-800">PO-000005 Atlas Crane &amp; Rigging</span>
            <span className="text-[11px] font-semibold text-zinc-700">$220,000.00</span>
          </div>
          <div className="mt-0.5 text-[10px] text-accent-700">USD down 45% since pricing — settling now lands under budget</div>
        </div>
        <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-zinc-800">REQ-000040 NCDMB compliance audit</span>
            <span className="text-[11px] font-semibold text-zinc-700">₦950,000.00</span>
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-400">7 days waiting — your finance admin step</div>
        </div>
      </div>
    </div>
  );
}

export function MatchPanelCard({ invoice, amount, flag }: { invoice: string; amount: string; flag: string }) {
  return (
    <div className="w-full max-w-[290px] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
      <WindowDots />
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-zinc-900">{invoice}</span>
        <span className="text-[12px] font-semibold text-zinc-700">{amount}</span>
      </div>
      <div className="mt-2 rounded-md border-l-2 border-amber-500 bg-amber-50 px-2.5 py-2 text-[10.5px] text-amber-800">{flag}</div>
    </div>
  );
}
