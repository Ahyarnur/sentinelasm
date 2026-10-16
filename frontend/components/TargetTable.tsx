import { Download, Play } from "lucide-react";

import { Button } from "./Button";
import type { ScanInfo, Target } from "@/lib/types";
import { SCAN_IDLE, SCAN_LABEL } from "@/lib/ui";

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
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Domain</th>
            <th>Status</th>
            <th className="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((t) => {
            const scan = scans[t.id];
            const label = (scan && SCAN_LABEL[scan.status]) || SCAN_IDLE;
            const running = scan?.status === "queued" || scan?.status === "running";
            const finished = scan?.finished_at
              ? new Date(scan.finished_at).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Jakarta",
                })
              : null;

            return (
              <tr key={t.id}>
                <td>
                  <span className="cell-title">{t.domain}</span>
                  {!t.scope_verified && (
                    <span className="chip chip-plain ml-2">Belum terverifikasi</span>
                  )}
                </td>
                <td>
                  <span className={label.className}>{label.text}</span>
                  {finished ? <div className="mt-0.5 text-xs text-faint">{finished}</div> : null}
                </td>
                <td>
                  <div className="cell-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onScan(t.id)}
                      disabled={running}
                      aria-label={`Pindai ${t.domain}`}
                    >
                      <Play size={13} aria-hidden="true" />
                      {running ? "Berjalan…" : "Scan"}
                    </Button>
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => onReport(t.id)}
                      aria-label={`Unduh laporan PDF untuk ${t.domain}`}
                    >
                      <Download size={13} aria-hidden="true" />
                      Laporan PDF
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {targets.length === 0 && (
            <tr>
              <td colSpan={3} className="empty">
                Belum ada target. Tambahkan domain pada panel “Tambah target”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
