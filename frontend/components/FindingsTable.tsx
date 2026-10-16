"use client";

import Link from "next/link";

import { SeverityBadge } from "./SeverityBadge";
import { formatDateTime } from "@/lib/format";
import type { Finding, FindingStatus } from "@/lib/types";
import { FINDING_STATUS_LABEL, FINDING_STATUS_ORDER } from "@/lib/ui";

export function FindingsTable({
  findings,
  assetNames,
  limit,
  onStatusChange,
  busyId,
  showAsset = true,
}: {
  findings: Finding[];
  assetNames?: Record<number, string>;
  limit?: number;
  onStatusChange?: (finding: Finding, status: FindingStatus) => void;
  busyId?: number | null;
  showAsset?: boolean;
}) {
  const rows = typeof limit === "number" ? findings.slice(0, limit) : findings;

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Judul</th>
            {showAsset ? <th>Aset</th> : null}
            <th>CVE</th>
            <th>Sumber</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((finding) => (
            <tr key={finding.id}>
              <td>
                <SeverityBadge severity={finding.severity} />
              </td>
              <td>
                <span className="cell-title" title={finding.description}>
                  {finding.title}
                </span>
                <div className="cell-sub">
                  {finding.confidence ? `keyakinan ${finding.confidence} · ` : ""}
                  {formatDateTime(finding.created_at)}
                </div>
              </td>
              {showAsset ? (
                <td className="cell-muted">
                  {assetNames?.[finding.asset_id] ? (
                    <Link
                      className="cell-link"
                      href={`/findings?asset_id=${finding.asset_id}`}
                    >
                      {assetNames[finding.asset_id]}
                    </Link>
                  ) : (
                    `#${finding.asset_id}`
                  )}
                </td>
              ) : null}
              <td className="cell-muted whitespace-nowrap">{finding.cve ?? "—"}</td>
              <td className="cell-muted whitespace-nowrap">{finding.source}</td>
              <td>
                {onStatusChange ? (
                  <select
                    className="input input-sm"
                    value={finding.status}
                    disabled={busyId === finding.id}
                    onChange={(e) =>
                      onStatusChange(finding, e.target.value as FindingStatus)
                    }
                    aria-label={`Status remediasi ${finding.title}`}
                  >
                    {FINDING_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {FINDING_STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="chip chip-plain">
                    {FINDING_STATUS_LABEL[finding.status] ?? finding.status}
                  </span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={showAsset ? 6 : 5} className="empty">
                Belum ada temuan yang cocok. Tambahkan target lalu jalankan scan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
