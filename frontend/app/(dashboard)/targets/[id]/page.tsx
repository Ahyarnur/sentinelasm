"use client";

import { Download, Play, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import {
  AssetTable,
  FindingsTable,
  PageHead,
  Panel,
  RefreshAction,
  ScanErrors,
  ScanProgress,
  ScanTable,
  StatCard,
  UpdatedAt,
} from "@/components";
import { ApiError, api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useResource, useTitle } from "@/lib/hooks";
import type { Asset, Finding, Report, Scan, Target } from "@/lib/types";
import { hostById, isScanActive } from "@/lib/ui";

type TargetDetail = {
  target: Target | null;
  scans: Scan[];
  assets: Asset[];
  findings: Finding[];
  reports: Report[];
};

export default function TargetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const targetId = Number(rawId);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, error, loading, reload, fetchedAt } = useResource<TargetDetail>(
    async () => {
      const targets = await api.targets();
      const target = targets.find((item) => item.id === targetId) ?? null;
      if (!target) {
        return { target: null, scans: [], assets: [], findings: [], reports: [] };
      }
      const [scans, assets, findings, reports] = await Promise.all([
        api.scansForTarget(targetId),
        api.assets({ target_id: targetId }),
        api.findings({ target_id: targetId }),
        api.reports({ target_id: targetId }),
      ]);
      return { target, scans, assets, findings, reports };
    },
    {
      key: `target-${targetId}`,
      pollMs: (current) =>
        (current?.scans ?? []).some((scan) => isScanActive(scan.status)) ? 4000 : 20000,
    },
  );

  useTitle(data?.target ? data.target.domain : "Detail target");

  const target = data?.target ?? null;
  const scans = data?.scans ?? [];
  const assets = data?.assets ?? [];
  const findings = data?.findings ?? [];
  const reports = data?.reports ?? [];

  const activeScan = scans.find((scan) => isScanActive(scan.status)) ?? null;
  const latestScan = activeScan ?? scans[0] ?? null;
  const critical = findings.filter((f) => f.severity === "critical").length;

  function reportError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) return;
    setActionError((e as Error).message);
  }

  async function runScan() {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await api.scanTarget(targetId);
      setNotice("Scan diantrekan. Fase di bawah akan bergerak saat worker mengambil job.");
      await reload();
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }

  async function downloadReport(kind: "pdf" | "html" = "pdf") {
    setBusy(true);
    setActionError(null);
    try {
      const report = await api.createReport(targetId, kind);
      await api.downloadReport(report.id, report.kind);
      await reload();
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }

  async function downloadExisting(report: Report) {
    setBusy(true);
    setActionError(null);
    try {
      await api.downloadReport(report.id, report.kind);
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }

  async function removeTarget() {
    if (!target) return;
    if (
      !window.confirm(
        `Hapus target ${target.domain}? Aset dan temuan terkait akan ikut terhapus.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await api.deleteTarget(target.id);
      router.push("/targets");
    } catch (e) {
      reportError(e);
      setBusy(false);
    }
  }

  if (loading && !data) {
    return <p className="cell-muted">Memuat detail target…</p>;
  }

  if (!target) {
    return (
      <>
        <PageHead
          eyebrow="Target · detail"
          title="Target tidak ditemukan"
          lede="Domain ini mungkin sudah dihapus. Kembali ke daftar target untuk melihat yang tersedia."
        />
        <a className="btn btn-ghost" href="/targets">
          Kembali ke daftar target
        </a>
      </>
    );
  }

  return (
    <>
      <PageHead
        eyebrow="Target · detail"
        title={target.domain}
        lede={
          <>
            Ditambahkan {formatDateTime(target.created_at)} ·{" "}
            {target.scope_verified ? "scope terverifikasi" : "scope belum terverifikasi"}
            {target.schedule_cron ? ` · jadwal ${target.schedule_cron}` : ""}
          </>
        }
        meta={
          <>
            <UpdatedAt at={fetchedAt} />
            <RefreshAction onRefresh={reload} />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void runScan()}
              disabled={busy || !!activeScan}
            >
              <Play size={13} aria-hidden="true" />
              {activeScan ? "Scan berjalan…" : "Scan sekarang"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void downloadReport("pdf")}
              disabled={busy}
            >
              <Download size={13} aria-hidden="true" />
              <span className="btn-label">Laporan PDF</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-danger"
              onClick={() => void removeTarget()}
              disabled={busy}
            >
              <Trash2 size={13} aria-hidden="true" />
              <span className="btn-label">Hapus</span>
            </button>
          </>
        }
      />

      {actionError ? <p className="alert">{actionError}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="alert">{error}</p> : null}

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Aset" value={assets.length} hint="Host pada target ini" />
        <StatCard label="Temuan" value={findings.length} hint="Seluruh severity" />
        <StatCard
          label="Kritis"
          value={critical}
          tone="critical"
          hint={critical > 0 ? "Perlu tindakan segera" : "Tidak ada"}
        />
        <StatCard label="Scan" value={scans.length} hint="Riwayat pemindaian" />
      </section>

      <Panel
        title="Progres scan"
        meta={
          latestScan
            ? `Scan #${latestScan.id} · ${latestScan.kind}`
            : "Belum ada scan untuk target ini"
        }
        className="mb-4"
      >
        <div className="panel-body">
          {latestScan ? (
            <>
              <ScanProgress scan={latestScan} />
              <ScanErrors scan={latestScan} />
            </>
          ) : (
            <p className="cell-muted">
              Jalankan <b>Scan sekarang</b> untuk memetakan subdomain, port, dan temuan pada
              domain ini.
            </p>
          )}
        </div>
      </Panel>

      <Panel
        title="Riwayat scan"
        meta={`${scans.length} pemindaian tercatat`}
        flush
        className="mb-4"
      >
        <ScanTable scans={scans} showTarget={false} />
      </Panel>

      <Panel
        title="Aset"
        meta={`${assets.length} host ditemukan`}
        flush
        className="mb-4"
      >
        <AssetTable assets={assets} targetNames={{ [target.id]: target.domain }} />
      </Panel>

      <Panel
        title="Temuan"
        meta={`${findings.length} temuan · kelola status di halaman Temuan`}
        flush
        className="mb-4"
        action={
          <a className="btn btn-ghost btn-sm" href={`/findings?target_id=${target.id}`}>
            Kelola temuan
          </a>
        }
      >
        <FindingsTable findings={findings} assetNames={hostById(assets)} />
      </Panel>

      <Panel
        title="Laporan"
        meta={`${reports.length} artefak tersimpan`}
        flush
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void downloadReport("html")}
              disabled={busy}
            >
              Buat HTML
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void downloadReport("pdf")}
              disabled={busy}
            >
              <Download size={13} aria-hidden="true" />
              Buat PDF
            </button>
          </div>
        }
      >
        {reports.length === 0 ? (
          <p className="empty">Belum ada laporan. Buat laporan untuk mengabadikan hasil scan.</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Jenis</th>
                  <th>Dibuat</th>
                  <th className="text-right">Unduh</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="cell-title uppercase">{report.kind}</td>
                    <td className="cell-muted whitespace-nowrap">
                      {formatDateTime(report.created_at)}
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void downloadExisting(report)}
                          disabled={busy}
                        >
                          <Download size={13} aria-hidden="true" />
                          Unduh
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
