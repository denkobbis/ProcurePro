"use client";

export interface ListTab {
  key: string;
  label: string;
  count: number;
}

export default function ListTabs({
  tabs,
  active,
  onChange,
  filters,
}: {
  tabs: ListTab[];
  active: string;
  onChange: (key: string) => void;
  filters?: string[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200">
      <div className="flex flex-wrap gap-5">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                isActive ? "border-brand-600 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t.label}
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                  isActive ? "bg-brand-600 text-white" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
      {filters && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-2.5">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
