"use client";

import { Activity } from "lucide-react";
import Link from "next/link";

import {
  FindingsTable,
  PageHead,
  Panel,
  RefreshAction,
  SeverityChart,
  StatCard,
  UpdatedAt,
} from "@/components";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useResource, useTitle } from "@/lib/hooks";
import type { Asset, Finding, Scan, Summary, Target } from "@/lib/types";
import { domainById, hostById, isScanActive, scanLabel } from "@/lib/ui";

const FINDINGS_LIMIT = 8;
const SCANS_LIMIT = 6;

type Overview = {
  summary: Summary;
  targets: Target[];
  findings: Finding[];
  scans: Scan[];
  assets: Asset[];
};

export default function OverviewPage() {
  useTitle("Ikhtisar");

  const { data, error, loading, reload, fetchedAt } = useResource<Overview>(
    async () => {
      const [summary, targets, findings, scans, assets] = await Promise.all([
        api.summary(),
        api.targets(),
        api.findings(),
        api.scans(SCANS_LIMIT),
        api.assets(),
      ]);
      return { summary, targets, findings, scans, assets };
    },
    {
      key: "overview",
      // Polling lebih cepat saat ada scan berjalan supaya fase & hitungan terlihat.
      pollMs: (current) =>
        (current?.scans ?? []).some((scan) => isScanActive(scan.status)) ? 4000 : 15000,
    },
  );

  const summary = data?.summary;
  const counts = summary?.severity_counts ?? {};
  const critical = counts.critical ?? 0;
  const urgent = critical + (counts.high ?? 0);
  const targets = data?.targets ?? [];
  const scans = data?.scans ?? [];
  const scanActive = scans.some((scan) => isScanActive(scan.status));

  return (
    <>
      <PageHead
        eyebrow="Monitor · attack surface"
        title="Ikhtisar pemindaian"
        lede="Ringkasan target, aset, dan temuan dari seluruh pemindaian yang pernah dijalankan."
        meta={
          <>
            <UpdatedAt at={fetchedAt} />
            {scanActive ? (
              <span className="chip chip-high">
                <Activity size={12} aria-hidden="true" className="mr-1" />
                Scan berjalan
              </span>
            ) : null}
            <RefreshAction onRefresh={reload} />
          </>
        }
      />

      {error ? <p className="alert">{error}</p> : null}
      {loading && !data ? <p className="cell-muted">Memuat data…</p> : null}

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Target" value={summary?.targets ?? 0} hint="Domain terdaftar" />
        <StatCard
          label="Aset"
          value={summary?.assets ?? 0}
          hint="Host & subdomain ditemukan"
        />
        <StatCard
          label="Temuan"
          value={summary?.findings ?? 0}
          hint={urgent > 0 ? `${urgent} perlu prioritas` : "Tanpa prioritas tinggi"}
        />
        <StatCard
          label="Kritis"
          value={critical}
          tone="critical"
          hint={critical > 0 ? "Perlu tindakan segera" : "Tidak ada"}
        />
      </section>

      <div className="mb-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel title="Distribusi severity" meta="Seluruh temuan pada semua target">
          <div className="panel-body">
            <SeverityChart counts={counts} />
          </div>
        </Panel>

        <Panel title="Scan terbaru" meta={`${scans.length} aktivitas terakhir`}>
          <div className="panel-body-tight">
            {scans.length > 0 ? (
              <ul className="feed">
                {scans.map((scan) => {
                  const label = scanLabel(scan.status);
                  return (
                    <li key={scan.id}>
                      <div className="feed-main">
                        <Link className="cell-link" href={`/targets/${scan.target_id}`}>
                          {domainById(targets)[scan.target_id] ?? `Target #${scan.target_id}`}
                        </Link>
                        <span className="cell-sub">
                          scan #{scan.id} · {formatDateTime(scan.started_at)}
                        </span>
                      </div>
                      <span className={label.className}>{label.text}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="cell-muted py-3">
                Belum ada scan. Tambahkan target lalu jalankan scan dari halaman{" "}
                <Link className="cell-link" href="/targets">
                  Target
                </Link>
                .
              </p>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Temuan terbaru"
        meta={
          (data?.findings.length ?? 0) > 0
            ? `Menampilkan ${Math.min(data?.findings.length ?? 0, FINDINGS_LIMIT)} dari ${data?.findings.length} temuan`
            : "Belum ada temuan"
        }
        flush
        action={
          <Link className="btn btn-ghost btn-sm" href="/findings">
            Lihat semua
          </Link>
        }
      >
        <FindingsTable
          findings={data?.findings ?? []}
          assetNames={hostById(data?.assets ?? [])}
          limit={FINDINGS_LIMIT}
        />
      </Panel>
    </>
  );
}
