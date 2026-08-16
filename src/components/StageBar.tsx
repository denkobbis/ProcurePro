export default function StageBar({ filled, total = 4 }: { filled: number; total?: number }) {
  return (
    <div className="flex gap-0.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1 w-3.5 rounded-full ${i < filled ? "bg-brand-600" : "bg-zinc-200"}`} />
      ))}
    </div>
  );
}
