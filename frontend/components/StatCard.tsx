import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={`text-2xl font-semibold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
