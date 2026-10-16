import { SEVERITY_CHIP, severityLabel } from "@/lib/ui";

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={SEVERITY_CHIP[severity] ?? "chip chip-info"} title={severity}>
      {severityLabel(severity)}
    </span>
  );
}
