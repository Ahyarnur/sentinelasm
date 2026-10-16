import type { ScanInfo, Target } from "@/lib/types";
import { SCAN_LABEL } from "@/lib/ui";

export function TargetTable({
  targets,
  scans,
  onScan,
  onReport,
}: {
  targets: Target[];
  scans: Record<number, ScanInfo>;
  onScan: (id: number) => void;
  onReport: (id: number) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-slate-400">
        <tr>
          <th className="py-1">Domain</th>
          <th>Status</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {targets.map((t) => {
          const scan = scans[t.id];
          const label = scan ? SCAN_LABEL[scan.status] : undefined;
          const running = scan?.status === "queued" || scan?.status === "running";
          return (
            <tr key={t.id} className="border-t border-slate-800">
              <td className="py-2">{t.domain}</td>
              <td className={`py-2 ${label?.className ?? "text-slate-500"}`}>
                {label?.text ?? "Belum discan"}
              </td>
              <td className="flex gap-2 py-2">
                <button
                  onClick={() => onScan(t.id)}
                  disabled={running}
                  className="rounded border border-slate-700 px-2 py-1 hover:bg-slate-800 disabled:opacity-40"
                >
                  {running ? "Berjalan..." : "Scan"}
                </button>
                <button
                  onClick={() => onReport(t.id)}
                  className="rounded border border-slate-700 px-2 py-1 hover:bg-slate-800"
                >
                  Laporan PDF
                </button>
              </td>
            </tr>
          );
        })}
        {targets.length === 0 && (
          <tr>
            <td colSpan={3} className="py-2 text-slate-500">
              Belum ada target.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
