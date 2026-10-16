"use client";

import { Download, FileText } from "lucide-react";
import { useState } from "react";

import { PageHead, Panel, RefreshAction, UpdatedAt } from "@/components";
import { ApiError, api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useResource, useTitle } from "@/lib/hooks";
import type { Report, Target } from "@/lib/types";
import { domainById } from "@/lib/ui";

type ReportsData = { reports: Report[]; targets: Target[] };

export default function ReportsPage() {
  useTitle("Laporan");

  const [targetId, setTargetId] = useState("");
  const [kind, setKind] = useState<"pdf" | "html">("pdf");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, loading, reload, fetchedAt } = useResource<ReportsData>(
    async () => {
      const [reports, targets] = await Promise.all([api.reports(), api.targets()]);
      return { reports, targets };
    },
    { key: "reports", pollMs: 30000 },
  );

  const reports = data?.reports ?? [];
  const targets = data?.targets ?? [];
  const names = domainById(targets);

  function reportError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) return;
    setActionError((e as Error).message);
  }

  async function createReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = Number(targetId);
    if (!Number.isFinite(id) || id <= 0 || busy) return;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const report = await api.createReport(id, kind);
      await api.downloadReport(report.id, report.kind);
      setNotice(
        `Laporan ${report.kind.toUpperCase()} untuk ${names[id] ?? `target #${id}`} dibuat dan diunduh.`,
      );
      await reload();
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }

  async function download(report: Report) {
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

  return (
    <>
      <PageHead
        eyebrow="Pelaporan · artefak"
        title="Laporan"
        lede="Buat dan unduh laporan hasil pemindaian per target, dalam bentuk PDF atau HTML."
        meta={
          <>
            <UpdatedAt at={fetchedAt} />
            <RefreshAction onRefresh={reload} />
          </>
        }
      />

      {actionError ? <p className="alert">{actionError}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="alert">{error}</p> : null}

      <Panel
        title="Buat laporan"
        meta="Laporan dibuat dari data terkini target terpilih"
        className="mb-4"
      >
        <div className="panel-body">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={createReport}
          >
            <div className="field flex-1">
              <label htmlFor="report-target">Target</label>
              <select
                id="report-target"
                className="input"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                required
              >
                <option value="">Pilih target…</option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.domain}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="report-kind">Format</label>
              <select
                id="report-kind"
                className="input"
                value={kind}
                onChange={(e) => setKind(e.target.value === "html" ? "html" : "pdf")}
              >
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || !targetId}
            >
              <FileText size={15} aria-hidden="true" />
              {busy ? "Memproses…" : "Buat & unduh"}
            </button>
          </form>
          {targets.length === 0 ? (
            <p className="panel-meta mt-3">
              Belum ada target. Tambahkan domain lebih dulu di halaman Target.
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="Artefak tersimpan"
        meta={`${reports.length} laporan`}
        flush
      >
        {loading && !data ? (
          <p className="empty">Memuat laporan…</p>
        ) : reports.length === 0 ? (
          <p className="empty">Belum ada laporan yang dibuat.</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Format</th>
                  <th>Dibuat</th>
                  <th className="text-right">Unduh</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <a className="cell-link" href={`/targets/${report.target_id}`}>
                        {names[report.target_id] ?? `Target #${report.target_id}`}
                      </a>
                    </td>
                    <td className="cell-title uppercase">{report.kind}</td>
                    <td className="cell-muted whitespace-nowrap">
                      {formatDateTime(report.created_at)}
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void download(report)}
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
