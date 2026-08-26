export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-lg font-semibold tracking-tight text-zinc-900 first:mt-0 dark:text-zinc-100">{children}</h2>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</ul>;
}
