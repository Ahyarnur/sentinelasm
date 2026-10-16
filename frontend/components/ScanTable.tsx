"use client";

import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { ScanErrors } from "./ScanProgress";
import { betweenSeconds, formatDateTime, formatDuration } from "@/lib/format";
import type { Scan } from "@/lib/types";
import { phaseLabel, scanLabel } from "@/lib/ui";

export function ScanTable({
  scans,
  targetNames,
  showTarget = true,
}: {
  scans: Scan[];
  targetNames?: Record<number, string>;
  showTarget?: boolean;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {showTarget ? <th>Target</th> : null}
            <th>Status</th>
            <th>Fase</th>
            <th>Mulai</th>
            <th className="num">Durasi</th>
            <th className="num">Aset</th>
            <th className="num">Layanan</th>
            <th className="num">Endpoint</th>
            <th className="num">Temuan</th>
            <th aria-label="Detail" />
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => {
            const label = scanLabel(scan.status);
            const seconds = betweenSeconds(scan.started_at, scan.finished_at);
            const problemCount =
              (scan.summary.scanner_errors?.length ?? 0) + (scan.summary.error ? 1 : 0);
            const open = openId === scan.id;
            const canExpand = problemCount > 0 || !!scan.summary.note;

            return (
              <Fragment key={scan.id}>
                <tr>
                  {showTarget ? (
                    <td>
                      <Link className="cell-link" href={`/targets/${scan.target_id}`}>
                        {targetNames?.[scan.target_id] ?? `#${scan.target_id}`}
                      </Link>
                      <div className="cell-sub">scan #{scan.id}</div>
                    </td>
                  ) : null}
                  <td>
                    <span className={label.className}>{label.text}</span>
                  </td>
                  <td className="cell-muted">{phaseLabel(scan.phase)}</td>
                  <td className="cell-muted whitespace-nowrap">
                    {formatDateTime(scan.started_at)}
                  </td>
                  <td className="num cell-muted">
                    {seconds === null ? "—" : formatDuration(seconds)}
                  </td>
                  <td className="num">{scan.summary.assets ?? 0}</td>
                  <td className="num">{scan.summary.services ?? 0}</td>
                  <td className="num">{scan.summary.endpoints ?? 0}</td>
                  <td className="num">{scan.summary.findings_total ?? 0}</td>
                  <td className="cell-muted">
                    {canExpand ? (
                      <button
                        type="button"
                        className="row-toggle row-toggle-icon"
                        onClick={() => setOpenId(open ? null : scan.id)}
                        aria-expanded={open}
                        aria-label={`Detail masalah scan #${scan.id}`}
                      >
                        <AlertTriangle size={13} aria-hidden="true" />
                        <span>{problemCount > 0 ? problemCount : ""}</span>
                        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    ) : null}
                  </td>
                </tr>
                {open ? (
                  <tr className="row-detail">
                    <td colSpan={showTarget ? 10 : 9}>
                      <ScanErrors scan={scan} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          {scans.length === 0 && (
            <tr>
              <td colSpan={showTarget ? 10 : 9} className="empty">
                Belum ada riwayat scan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
