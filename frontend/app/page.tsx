"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AuthForm,
  FindingsTable,
  SeverityChart,
  StatCard,
  TargetTable,
} from "@/components";
import { api, clearToken, getToken } from "@/lib/api";
import type { Finding, ScanInfo, Summary, Target } from "@/lib/types";

export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scans, setScans] = useState<Record<number, ScanInfo>>({});
  const [domain, setDomain] = useState("");

  useEffect(() => {
    if (getToken()) setAuthed(true);
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

  async function handleAuth(email: string, password: string) {
    try {
      try {
        await api.register(email, password);
      } catch {
        /* sudah terdaftar — abaikan */
      }
      await api.login(email, password);
      setAuthed(true);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addTarget() {
    if (!domain.trim()) return;
    try {
      await api.createTarget(domain.trim());
      setDomain("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
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

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">SentinelASM</h1>
        <button
          onClick={() => {
            clearToken();
            setAuthed(false);
          }}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          Keluar
        </button>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Target" value={summary?.targets ?? 0} />
        <StatCard label="Aset" value={summary?.assets ?? 0} />
        <StatCard label="Temuan" value={summary?.findings ?? 0} />
        <StatCard
          label="Critical"
          value={summary?.severity_counts?.critical ?? 0}
          accent="text-red-400"
        />
      </section>

      <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-2 font-semibold">Distribusi Severity</h2>
        <SeverityChart counts={summary?.severity_counts ?? {}} />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Tambah Target</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-slate-700 bg-slate-900 p-2"
            placeholder="contoh.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <button
            onClick={addTarget}
            className="rounded bg-indigo-600 px-4 font-medium hover:bg-indigo-500"
          >
            Tambah
          </button>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Target</h2>
        <TargetTable
          targets={targets}
          scans={scans}
          onScan={runScan}
          onReport={downloadReport}
        />
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Temuan Terbaru</h2>
        <FindingsTable findings={findings} />
      </section>
    </main>
  );
}
