"use client";

import { Activity, ExternalLink, LogOut, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  AuthForm,
  Button,
  FindingsTable,
  Panel,
  SeverityChart,
  StatCard,
  TargetTable,
} from "@/components";
import { API_URL, api, clearToken, getIdentity, getToken } from "@/lib/api";
import type { Finding, ScanInfo, Summary, Target } from "@/lib/types";

const FINDINGS_LIMIT = 20;

export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [identity, setIdentity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scans, setScans] = useState<Record<number, ScanInfo>>({});
  const [domain, setDomain] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (getToken()) {
      setAuthed(true);
      setIdentity(getIdentity());
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [s, t, f] = await Promise.all([
        api.summary(),
        api.targets(),
        api.findings(),
      ]);
      setSummary(s);
      setTargets(t);
      setFindings(f);

      const scanLists = await Promise.all(
        t.map((target: Target) => api.scans(target.id).catch(() => [])),
      );
      const latest: Record<number, ScanInfo> = {};
      t.forEach((target: Target, i: number) => {
        const newest = (scanLists[i] as ScanInfo[])[0];
        if (newest) latest[target.id] = newest;
      });
      setScans(latest);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (authed) void refresh();
  }, [authed, refresh]);

  // Poll lebih cepat saat ada scan berjalan, lebih lambat saat idle.
  const scanActive = Object.values(scans).some(
    (s) => s.status === "queued" || s.status === "running",
  );
  useEffect(() => {
    if (!authed) return;
    const id = setInterval(() => void refresh(), scanActive ? 4000 : 15000);
    return () => clearInterval(id);
  }, [authed, refresh, scanActive]);

  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  async function handleAuth(email: string, password: string) {
    try {
      try {
        await api.register(email, password);
      } catch {
        /* sudah terdaftar — abaikan */
      }
      await api.login(email, password);
      setIdentity(getIdentity());
      setAuthed(true);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!domain.trim() || adding) return;
    setAdding(true);
    try {
      await api.createTarget(domain.trim());
      setDomain("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function runScan(id: number) {
    try {
      await api.scanTarget(id);
      setScans((prev) => ({
        ...prev,
        [id]: { id: -1, status: "queued", summary: {}, finished_at: null },
      }));
      void refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function downloadReport(id: number) {
    try {
      const report = await api.createReport(id);
      await api.downloadReport(report.id, report.kind);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!authed) {
    return <AuthForm onSubmit={handleAuth} error={error} />;
  }

  const counts = summary?.severity_counts ?? {};
  const critical = counts.critical ?? 0;
  const urgent = critical + (counts.high ?? 0);
  const shownFindings = Math.min(findings.length, FINDINGS_LIMIT);

  return (
    <div className="min-h-screen">
      <div className="shell">
        <header className="float-nav">
          <a className="brand" href="#ikhtisar">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">
              <strong>SentinelASM</strong>
              <span>Attack Surface Management</span>
            </span>
          </a>

          <nav className="nav-tabs" aria-label="Bagian halaman">
            <a href="#ikhtisar">Ikhtisar</a>
            <a href="#target">Target</a>
            <a href="#temuan">Temuan</a>
          </nav>

          <div className="nav-end">
            {identity ? (
              <span className="user-chip" title={identity}>
                <b aria-hidden="true">{identity.slice(0, 1).toUpperCase()}</b>
                <span>{identity}</span>
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void manualRefresh()}
              disabled={refreshing}
              aria-label="Perbarui data"
              title="Perbarui data"
            >
              <RefreshCw size={13} aria-hidden="true" />
              <span className="btn-label">
                {refreshing ? "Memperbarui…" : "Perbarui"}
              </span>
            </Button>
            <Button
              variant="soft"
              size="sm"
              onClick={() => {
                clearToken();
                setAuthed(false);
              }}
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut size={13} aria-hidden="true" />
              <span className="btn-label">Keluar</span>
            </Button>
          </div>
        </header>
      </div>

      <main className="shell page-body">
        {error ? <p className="alert">{error}</p> : null}

        <div className="page-head" id="ikhtisar">
          <div className="min-w-0">
            <span className="eyebrow">Monitor · attack surface</span>
            <h1>Ikhtisar pemindaian</h1>
            <p className="lede">
              Ringkasan target, aset, dan temuan dari seluruh pemindaian yang pernah
              dijalankan.
            </p>
          </div>
          <div className="page-head-meta">
            <span>
              Diperbarui{" "}
              {updatedAt
                ? updatedAt.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZone: "Asia/Jakarta",
                  })
                : "—"}{" "}
              WIB
            </span>
            {scanActive ? (
              <span className="chip chip-high">
                <Activity size={12} aria-hidden="true" className="mr-1" />
                Scan berjalan
              </span>
            ) : null}
          </div>
        </div>

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

        <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <Panel title="Distribusi severity" meta="Seluruh temuan pada semua target">
            <div className="panel-body">
              <SeverityChart counts={counts} />
            </div>
          </Panel>

          <Panel
            title="Tambah target"
            meta="Scan dijalankan manual setelah target ditambahkan"
          >
            <div className="panel-body">
              <form className="flex flex-col gap-3" onSubmit={addTarget}>
                <div className="field">
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
                <Button type="submit" disabled={adding || !domain.trim()}>
                  <Plus size={15} aria-hidden="true" />
                  {adding ? "Menambahkan…" : "Tambah target"}
                </Button>
                <p className="panel-meta">
                  Hanya pindai domain yang Anda miliki atau berwenang menguji.
                </p>
              </form>
            </div>
          </Panel>
        </div>

        <Panel
          id="target"
          title="Target"
          meta={`${targets.length} domain terdaftar`}
          flush
          className="mb-4"
        >
          <TargetTable
            targets={targets}
            scans={scans}
            onScan={runScan}
            onReport={downloadReport}
          />
        </Panel>

        <Panel
          id="temuan"
          title="Temuan terbaru"
          meta={
            findings.length > 0
              ? `Menampilkan ${shownFindings} dari ${findings.length} temuan`
              : "Belum ada temuan"
          }
          flush
        >
          <FindingsTable findings={findings} limit={FINDINGS_LIMIT} />
        </Panel>
      </main>

      <footer className="shell site-foot">
        <span>SentinelASM · Platform Attack Surface Management</span>
        <nav>
          <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
            Dokumentasi API
            <ExternalLink size={11} aria-hidden="true" className="ml-1 inline align-[-1px]" />
          </a>
          <a href={`${API_URL}/health`} target="_blank" rel="noreferrer">
            Status API
            <ExternalLink size={11} aria-hidden="true" className="ml-1 inline align-[-1px]" />
          </a>
        </nav>
      </footer>
    </div>
  );
}
