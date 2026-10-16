"use client";

import { AlertTriangle, Check, CircleDashed, Loader } from "lucide-react";

import { betweenSeconds, formatDuration } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import type { Scan } from "@/lib/types";
import { SCAN_PHASES, isScanActive, phaseIndex, scanLabel } from "@/lib/ui";

/**
 * Progres scan dari data nyata: fase yang sedang dikerjakan worker plus hitungan
 * sementara. Tidak ada persentase karena total durasi tiap fase tidak diketahui.
 */
export function ScanProgress({ scan }: { scan: Scan }) {
  const now = useNow(1000);
  const active = isScanActive(scan.status);
  const elapsed = betweenSeconds(scan.started_at, scan.finished_at, now);
  const current = phaseIndex(scan.phase);
  const label = scanLabel(scan.status);

  return (
    <div className="scan-progress">
      <div className="scan-progress-head">
        <span className={label.className}>{label.text}</span>
        <span className="scan-progress-meta">
          {active && scan.phase
            ? `Fase ${current + 1}/${SCAN_PHASES.length} · ${SCAN_PHASES[current]?.label}`
            : active
              ? "Menunggu worker mengambil job"
              : scan.finished_at
                ? "Durasi"
                : "—"}
        </span>
        <span className="scan-progress-timer">
          {elapsed === null ? "—" : formatDuration(elapsed)}
        </span>
      </div>

      <ol className="stepper">
        {SCAN_PHASES.map((phase, index) => {
          const state = !active
            ? "done"
            : current < 0
              ? "pending"
              : index < current
                ? "done"
                : index === current
                  ? "current"
                  : "pending";
          return (
            <li className="step" key={phase.key} data-state={state}>
              <span className="step-dot" aria-hidden="true">
                {state === "done" ? (
                  <Check size={11} />
                ) : state === "current" ? (
                  <Loader size={11} />
                ) : (
                  <CircleDashed size={11} />
                )}
              </span>
              <span className="step-text">
                <b>{phase.label}</b>
                <em>{phase.hint}</em>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="scan-counts">
        <Count label="Aset" value={scan.summary.assets} />
        <Count label="Layanan" value={scan.summary.services} />
        <Count label="Endpoint" value={scan.summary.endpoints} />
        <Count label="Temuan" value={scan.summary.findings} />
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number | undefined }) {
  return (
    <span className="scan-count">
      <b>{value ?? 0}</b>
      <span>{label}</span>
    </span>
  );
}

/**
 * Bagian D: error scanner. Sebelumnya hanya tersimpan di database tanpa pernah
 * ditampilkan, sehingga status "Selesai (peringatan)" tidak bisa ditindaklanjuti.
 */
export function ScanErrors({ scan }: { scan: Scan }) {
  const errors = scan.summary.scanner_errors ?? [];
  const fatal = scan.summary.error;
  const note = scan.summary.note;

  if (!fatal && !note && errors.length === 0) return null;

  return (
    <div className="scan-errors">
      {fatal ? (
        <p className="scan-error-line">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>
            <b>Gagal:</b> {fatal}
          </span>
        </p>
      ) : null}
      {note ? (
        <p className="scan-error-line">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>{note}</span>
        </p>
      ) : null}
      {errors.length > 0 ? (
        <>
          <p className="scan-error-title">
            <AlertTriangle size={13} aria-hidden="true" />
            {errors.length} scanner gagal
          </p>
          <ul>
            {errors.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** Bar fase ringkas untuk dipakai di dalam tabel. */
export function ScanProgressBar({ scan }: { scan: Scan }) {
  const now = useNow(1000);
  const active = isScanActive(scan.status);
  const current = phaseIndex(scan.phase);
  const elapsed = betweenSeconds(scan.started_at, scan.finished_at, now);

  return (
    <span className="mini-stepper" title={scan.phase ?? scan.status}>
      {SCAN_PHASES.map((phase, index) => (
        <i
          key={phase.key}
          data-state={
            !active
              ? "done"
              : current < 0
                ? "pending"
                : index < current
                  ? "done"
                  : index === current
                    ? "current"
                    : "pending"
          }
        />
      ))}
      <span className="mini-stepper-time">
        {elapsed === null ? "—" : formatDuration(elapsed)}
      </span>
    </span>
  );
}
