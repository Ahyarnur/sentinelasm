import type { CSSProperties } from "react";

import { SEVERITY_BAR, SEVERITY_ORDER, severityLabel } from "@/lib/ui";

/**
 * Distribusi severity sebagai daftar bar bergradasi (bevel).
 * Warna hanya menunjuk token lewat SEVERITY_BAR — tanpa hex di sini.
 */
export function SeverityChart({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...SEVERITY_ORDER.map((sev) => counts[sev] ?? 0));

  return (
    <div className="bar-list">
      {SEVERITY_ORDER.map((sev) => {
        const count = counts[sev] ?? 0;
        const token = SEVERITY_BAR[sev] ?? SEVERITY_BAR.info;
        const pct = count === 0 ? 0 : Math.max(4, Math.round((count / max) * 100));
        return (
          <div className="bar-row" key={sev}>
            <span className="bar-row-label">{severityLabel(sev)}</span>
            <span className="bar-track">
              <span
                className="bar-fill"
                style={
                  {
                    "--bar-face": token.face,
                    "--bar-top": token.top,
                    width: `${pct}%`,
                  } as CSSProperties
                }
              />
            </span>
            <span className="bar-value">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
