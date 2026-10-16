import { SEVERITY_COLOR } from "@/lib/ui";

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_COLOR[severity] ?? "text-slate-400";
  return <span className={`font-medium ${cls}`}>{severity}</span>;
}
