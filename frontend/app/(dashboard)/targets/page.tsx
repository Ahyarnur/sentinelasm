"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { PageHead, Panel, RefreshAction, TargetTable, UpdatedAt } from "@/components";
import { ApiError, api } from "@/lib/api";
import { useResource, useTitle } from "@/lib/hooks";
import type { Scan, Target } from "@/lib/types";
import { isScanActive } from "@/lib/ui";

type TargetsData = {
  targets: Target[];
  scans: Record<number, Scan>;
};

export default function TargetsPage() {
  useTitle("Target");

  const [domain, setDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, loading, reload, fetchedAt } = useResource<TargetsData>(
    async () => {
      const targets = await api.targets();
      const lists = await Promise.all(
        targets.map((target) => api.scansForTarget(target.id).catch(() => [] as Scan[])),
      );
      const scans: Record<number, Scan> = {};
      targets.forEach((target, index) => {
        const newest = lists[index][0];
        if (newest) scans[target.id] = newest;
      });
      return { targets, scans };
    },
    {
      key: "targets",
      pollMs: (current) =>
        Object.values(current?.scans ?? {}).some((scan) => isScanActive(scan.status))
          ? 4000
          : 20000,
    },
  );

  const targets = data?.targets ?? [];
  const scans = data?.scans ?? {};
  const scanRunning = Object.values(scans).some((scan) => isScanActive(scan.status));

  function reportError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) return;
    setActionError((e as Error).message);
  }

  async function addTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = domain.trim();
    if (!value || adding) return;
    setAdding(true);
    setActionError(null);
    try {
      const created = await api.createTarget(value);
      setDomain("");
      setNotice(
        `Target ${created.domain} ditambahkan. Jalankan scan untuk mulai memetakan aset.`,
      );
      await reload();
    } catch (e) {
      reportError(e);
    } finally {
      setAdding(false);
    }
  }

  async function runScan(id: number) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.scanTarget(id);
      setNotice("Scan diantrekan. Fase akan muncul di halaman detail target.");
      await reload();
    } catch (e) {
      reportError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function downloadReport(id: number) {
    setBusyId(id);
    setActionError(null);
    try {
      const report = await api.createReport(id, "pdf");
      await api.downloadReport(report.id, report.kind);
    } catch (e) {
      reportError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTarget(target: Target) {
    if (
      !window.confirm(
        `Hapus target ${target.domain}? Aset dan temuan terkait akan ikut terhapus.`,
      )
    ) {
      return;
    }
    setBusyId(target.id);
    setActionError(null);
    try {
      await api.deleteTarget(target.id);
      setNotice(`Target ${target.domain} dihapus.`);
      await reload();
    } catch (e) {
      reportError(e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHead
        eyebrow="Inventaris · domain"
        title="Target"
        lede="Domain yang dipantau. Setiap target dapat dipindai manual; hasilnya tersimpan sebagai riwayat scan."
        meta={
          <>
            <UpdatedAt at={fetchedAt} />
            {scanRunning ? <span className="chip chip-high">Scan berjalan</span> : null}
            <RefreshAction onRefresh={reload} />
          </>
        }
      />

      {actionError ? <p className="alert">{actionError}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="alert">{error}</p> : null}

      <Panel
        title="Tambah target"
        meta="Case-sensitive tidak diperlukan — domain dinormalkan oleh backend"
        className="mb-4"
      >
        <div className="panel-body">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addTarget}>
            <div className="field flex-1">
              <label htmlFor="domain">Domain</label>
              <input
                id="domain"
                className="input"
                name="domain"
                placeholder="contoh.com"
                autoComplete="off"
                spellCheck={false}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={adding || !domain.trim()}
            >
              <Plus size={15} aria-hidden="true" />
              {adding ? "Menambahkan…" : "Tambah target"}
            </button>
          </form>
          <p className="panel-meta mt-3">
            Hanya pindai domain yang Anda miliki atau berwenang menguji.
          </p>
        </div>
      </Panel>

      <Panel
        title="Daftar target"
        meta={`${targets.length} domain terdaftar`}
        flush
        action={
          busyId !== null ? <span className="cell-muted">Memproses…</span> : undefined
        }
      >
        {loading && !data ? (
          <p className="empty">Memuat target…</p>
        ) : (
          <TargetTable
            targets={targets}
            scans={scans}
            onScan={runScan}
            onReport={downloadReport}
            onDelete={deleteTarget}
          />
        )}
      </Panel>
    </>
  );
}
