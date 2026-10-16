import { Download, ExternalLink, Play, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "./Button";
import { ScanProgressBar } from "./ScanProgress";
import { formatDateTime } from "@/lib/format";
import type { Scan, Target } from "@/lib/types";
import { isScanActive, scanLabel } from "@/lib/ui";

export function TargetTable({
  targets,
  scans,
  onScan,
  onReport,
  onDelete,
}: {
  targets: Target[];
  scans: Record<number, Scan>;
  onScan: (id: number) => void;
  onReport: (id: number) => void;
  onDelete?: (target: Target) => void;
}) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Domain</th>
            <th>Status terakhir</th>
            <th className="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => {
            const scan = scans[target.id];
            const label = scanLabel(scan?.status);
            const running = isScanActive(scan?.status);

            return (
              <tr key={target.id}>
                <td>
                  <Link className="cell-title cell-link" href={`/targets/${target.id}`}>
                    {target.domain}
                  </Link>
                  <div className="cell-sub">
                    {target.scope_verified ? "Scope terverifikasi" : "Belum terverifikasi"}
                    {target.schedule_cron ? ` · jadwal ${target.schedule_cron}` : ""}
                  </div>
                </td>
                <td>
                  <span className={label.className}>{label.text}</span>
                  {running ? (
                    <div className="mt-1">
                      <ScanProgressBar scan={scan} />
                    </div>
                  ) : scan?.finished_at ? (
                    <div className="cell-sub">{formatDateTime(scan.finished_at)}</div>
                  ) : null}
                </td>
                <td>
                  <div className="cell-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onScan(target.id)}
                      disabled={running}
                      aria-label={`Pindai ${target.domain}`}
                    >
                      <Play size={13} aria-hidden="true" />
                      {running ? "Berjalan…" : "Scan"}
                    </Button>
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => onReport(target.id)}
                      aria-label={`Unduh laporan PDF untuk ${target.domain}`}
                    >
                      <Download size={13} aria-hidden="true" />
                      <span className="btn-label">Laporan PDF</span>
                    </Button>
                    <Link
                      className="btn btn-ghost btn-sm"
                      href={`/targets/${target.id}`}
                      aria-label={`Detail ${target.domain}`}
                    >
                      <ExternalLink size={13} aria-hidden="true" />
                      <span className="btn-label">Detail</span>
                    </Link>
                    {onDelete ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(target)}
                        aria-label={`Hapus ${target.domain}`}
                        className="btn-danger"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </Button>
                    ) : null}
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
