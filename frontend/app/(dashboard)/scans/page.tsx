"use client";

import { PageHead, Panel, RefreshAction, ScanTable, UpdatedAt } from "@/components";
import { api } from "@/lib/api";
import { useResource, useTitle } from "@/lib/hooks";
import type { Scan, Target } from "@/lib/types";
import { domainById, isScanActive } from "@/lib/ui";

type ScansData = { scans: Scan[]; targets: Target[] };

const LIMIT = 200;

export default function ScansPage() {
  useTitle("Scan");

  const { data, error, loading, reload, fetchedAt } = useResource<ScansData>(
    async () => {
      const [scans, targets] = await Promise.all([api.scans(LIMIT), api.targets()]);
      return { scans, targets };
    },
    {
      key: "scans",
      pollMs: (current) =>
        (current?.scans ?? []).some((scan) => isScanActive(scan.status)) ? 4000 : 20000,
    },
  );

  const scans = data?.scans ?? [];
  const running = scans.filter((scan) => isScanActive(scan.status)).length;
  const withErrors = scans.filter(
    (scan) =>
      scan.status === "completed_with_errors" ||
      scan.status === "failed" ||
      (scan.summary.scanner_errors?.length ?? 0) > 0,
  ).length;

  return (
    <>
      <PageHead
        eyebrow="Operasi · riwayat"
        title="Scan"
        lede="Riwayat pemindaian dari seluruh target. Klik ikon peringatan pada baris untuk melihat scanner yang gagal."
        meta={
          <>
            <UpdatedAt at={fetchedAt} />
            {running > 0 ? (
              <span className="chip chip-high">{running} scan berjalan</span>
            ) : null}
            {withErrors > 0 ? (
              <span className="chip chip-medium">{withErrors} dengan catatan</span>
            ) : null}
            <RefreshAction onRefresh={reload} />
          </>
        }
      />

      {error ? <p className="alert">{error}</p> : null}

      <Panel
        title="Riwayat scan"
        meta={`${scans.length} pemindaian terakhir (maksimum ${LIMIT})`}
        flush
      >
        {loading && !data ? (
          <p className="empty">Memuat riwayat scan…</p>
        ) : (
          <ScanTable scans={scans} targetNames={domainById(data?.targets ?? [])} />
        )}
      </Panel>
    </>
  );
}
