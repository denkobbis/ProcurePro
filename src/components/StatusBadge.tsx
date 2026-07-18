const COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  info_requested: "bg-amber-100 text-amber-700",
  converted_to_po: "bg-purple-100 text-purple-700",
  pending: "bg-amber-100 text-amber-700",
  sent_to_vendor: "bg-blue-100 text-blue-700",
  in_transit: "bg-indigo-100 text-indigo-700",
  customs_clearance: "bg-orange-100 text-orange-700",
  partially_received: "bg-amber-100 text-amber-700",
  fully_received: "bg-green-100 text-green-700",
  closed: "bg-zinc-100 text-zinc-700",
  available: "bg-green-100 text-green-700",
  on_lease: "bg-blue-100 text-blue-700",
  maintenance: "bg-amber-100 text-amber-700",
  retired: "bg-zinc-100 text-zinc-700",
  active: "bg-blue-100 text-blue-700",
  returned: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  open: "bg-blue-100 text-blue-700",
  awarded: "bg-green-100 text-green-700",
  cancelled: "bg-zinc-100 text-zinc-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? "bg-zinc-100 text-zinc-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
