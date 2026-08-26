function ProgressRow({ label, fillPercent, valueLabel }: { label: string; fillPercent: number; valueLabel: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] uppercase tracking-[.08em] text-muted">{label}</span>
        <span className="text-[13px] text-ink">{valueLabel}</span>
      </div>
      <div className="h-2 w-full border border-line bg-white">
        <div
          className="h-full bg-forest"
          style={{ width: `${Math.max(0, Math.min(100, fillPercent))}%` }}
        />
      </div>
    </div>
  );
}

export interface ModuleProgressRow {
  label: string;
  fillPercent: number;
  valueLabel: string;
}

export function ModuleProgress({ rows }: { rows: ModuleProgressRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 border border-line bg-white/60 px-5 py-5">
      {rows.map((row) => (
        <ProgressRow key={row.label} {...row} />
      ))}
    </div>
  );
}
