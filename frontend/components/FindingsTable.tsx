import type { Finding } from "@/lib/types";

import { SeverityBadge } from "./SeverityBadge";

export function FindingsTable({
  findings,
  limit = 20,
}: {
  findings: Finding[];
  limit?: number;
}) {
  const rows = findings.slice(0, limit);

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Judul</th>
            <th>CVE</th>
            <th>Sumber</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.id}>
              <td>
                <SeverityBadge severity={f.severity} />
              </td>
              <td>
                <span className="cell-title">{f.title}</span>
              </td>
              <td className="cell-muted whitespace-nowrap">{f.cve ?? "—"}</td>
              <td className="cell-muted whitespace-nowrap">{f.source}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="empty">
                Belum ada temuan. Tambahkan target lalu jalankan scan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
