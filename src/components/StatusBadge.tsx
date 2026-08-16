// Each entry pairs a light badge (bg-{color}-100/text-{color}-700) with its
// dark equivalent (bg-{color}-500/10, text-{color}-400) — the same tinted-badge
// pattern already used elsewhere (dashboard KPI tints, trial-nudge banner).
const COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400",
  submitted: "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  under_review: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  info_requested: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  converted_to_po: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  sent_to_vendor: "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  in_transit: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  customs_clearance: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  partially_received: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  fully_received: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  closed: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400",
  available: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  on_lease: "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  retired: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400",
  active: "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  returned: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  open: "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  awarded: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  cancelled: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400",
  unpaid: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400",
  processing: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  partially_paid: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  success: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  reversed: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  trialing: "bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  past_due: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  canceled: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  pending_review: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400",
  matched: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  variance: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

const DEFAULT_COLOR = "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? DEFAULT_COLOR}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
