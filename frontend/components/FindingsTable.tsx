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
    <table className="w-full text-sm">
      <thead className="text-left text-slate-400">
        <tr>
          <th className="py-1">Severity</th>
          <th>Judul</th>
          <th>CVE</th>
          <th>Sumber</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((f) => (
          <tr key={f.id} className="border-t border-slate-800">
            <td className="py-2">
              <SeverityBadge severity={f.severity} />
            </td>
            <td className="py-2">{f.title}</td>
            <td className="py-2 text-slate-400">{f.cve ?? "-"}</td>
            <td className="py-2 text-slate-400">{f.source}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="py-2 text-slate-500">
              Belum ada temuan. Tambahkan target lalu jalankan scan.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
