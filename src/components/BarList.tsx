import { formatNaira } from "@/lib/money";
import type { SpendRow } from "@/lib/reports";

export default function BarList({ rows, limit }: { rows: SpendRow[]; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const max = Math.max(1, ...shown.map((r) => r.amount));

  if (shown.length === 0) {
    return <p className="text-sm text-zinc-400">No data yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {shown.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-zinc-700">{r.label}</span>
            <span className="font-medium text-zinc-900">{formatNaira(r.amount)}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${(r.amount / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
