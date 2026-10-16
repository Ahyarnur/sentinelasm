"use client";

import { useEffect, useState } from "react";

import { FindingsTable, PageHead, Panel, RefreshAction, UpdatedAt } from "@/components";
import { ApiError, api } from "@/lib/api";
import { useResource, useTitle } from "@/lib/hooks";
import type { Asset, Finding, FindingStatus, Target } from "@/lib/types";
import {
  FINDING_STATUS_LABEL,
  FINDING_STATUS_ORDER,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  hostById,
} from "@/lib/ui";

type FindingsData = {
  findings: Finding[];
  assets: Asset[];
  targets: Target[];
};

export default function FindingsPage() {
  useTitle("Temuan");

  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [assetFilter, setAssetFilter] = useState<number | null>(null);
  const [targetFilter, setTargetFilter] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter awal dari tautan (mis. dari tabel aset). Dibaca dari window agar
  // halaman tetap statis tanpa Suspense.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const asset = Number(params.get("asset_id"));
    const target = Number(params.get("target_id"));
    if (Number.isFinite(asset) && asset > 0) setAssetFilter(asset);
    if (Number.isFinite(target) && target > 0) setTargetFilter(target);
  }, []);

  const { data, error, loading, reload, fetchedAt } = useResource<FindingsData>(
    async () => {
      const [findings, assets, targets] = await Promise.all([
        api.findings({
          severity: severity || undefined,
          status: status || undefined,
          asset_id: assetFilter ?? undefined,
          target_id: targetFilter ?? undefined,
        }),
        api.assets(),
        api.targets(),
      ]);
      return { findings, assets, targets };
    },
    { key: `${severity}|${status}|${assetFilter ?? ""}|${targetFilter ?? ""}` },
  );

  const findings = data?.findings ?? [];
  const assetNames = hostById(data?.assets ?? []);

  async function changeStatus(finding: Finding, next: FindingStatus) {
    setBusyId(finding.id);
    setActionError(null);
    try {
      await api.updateFinding(finding.id, next);
      await reload();
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        setActionError((e as Error).message);
      }
    } finally {
      setBusyId(null);
    }
  }

  const filterActive = severity || status || assetFilter !== null || targetFilter !== null;

  function resetFilters() {
    setSeverity("");
    setStatus("");
    setAssetFilter(null);
    setTargetFilter(null);
  }

  return (
    <>
      <PageHead
        eyebrow="Triage · kerentanan"
        title="Temuan"
        lede="Seluruh temuan dari pemindaian, lengkap dengan severity, sumber, dan status remediasi."
        meta={
          <>
            <UpdatedAt at={fetchedAt} />
            <RefreshAction onRefresh={reload} />
          </>
        }
      />

      {actionError ? <p className="alert">{actionError}</p> : null}
      {error ? <p className="alert">{error}</p> : null}

      <Panel
        title="Daftar temuan"
        meta={`${findings.length} temuan${filterActive ? " (terfilter)" : ""}`}
        flush
        action={
          filterActive ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              Hapus filter
            </button>
          ) : undefined
        }
      >
        <div className="toolbar">
          <div className="field">
            <label htmlFor="filter-severity">Severity</label>
            <select
              id="filter-severity"
              className="input"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="">Semua severity</option>
              {SEVERITY_ORDER.map((item) => (
                <option key={item} value={item}>
                  {SEVERITY_LABEL[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Semua status</option>
              {FINDING_STATUS_ORDER.map((item) => (
                <option key={item} value={item}>
                  {FINDING_STATUS_LABEL[item]}
                </option>
              ))}
            </select>
          </div>
          {assetFilter !== null ? (
            <div className="field">
              <label>Aset</label>
              <span className="chip chip-plain">
                {assetNames[assetFilter] ?? `#${assetFilter}`}
              </span>
            </div>
          ) : null}
        </div>

        {loading && !data ? (
          <p className="empty">Memuat temuan…</p>
        ) : (
          <FindingsTable
            findings={findings}
            assetNames={assetNames}
            onStatusChange={changeStatus}
            busyId={busyId}
          />
        )}
      </Panel>
    </>
  );
}
