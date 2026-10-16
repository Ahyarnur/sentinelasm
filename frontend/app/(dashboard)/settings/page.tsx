"use client";

import { ExternalLink, Plug, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHead, Panel, RefreshAction, UpdatedAt } from "@/components";
import { API_URL, ApiError, api, getIdentity } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useResource, useTitle } from "@/lib/hooks";
import type { ScannerStatus } from "@/lib/types";

export default function SettingsPage() {
  useTitle("Pengaturan");

  const [testing, setTesting] = useState(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);
  const [identity, setIdentity] = useState<string | null>(null);

  const { data, error, loading, reload, fetchedAt } = useResource<ScannerStatus>(
    () => api.scanners(),
    { key: "scanners", pollMs: 60000 },
  );

  // Email dari klaim token; dibaca di efek agar server & klien sepakat.
  useEffect(() => {
    setIdentity(getIdentity());
  }, []);

  async function testWebhook() {
    setTesting(true);
    setWebhookResult(null);
    try {
      const result = await api.webhookTest();
      setWebhookResult(JSON.stringify(result));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return;
      setWebhookResult(`Gagal: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  const scanners = data?.scanners ?? [];
  const available = scanners.filter((scanner) => scanner.available).length;
  const fromApiOnly = data?.source === "api";

  return (
    <>
      <PageHead
        eyebrow="Sistem · konfigurasi"
        title="Pengaturan"
        lede="Status scanner, integrasi notifikasi, dan informasi akun."
        meta={
          <>
            <UpdatedAt at={fetchedAt} />
            <RefreshAction onRefresh={reload} />
          </>
        }
      />

      {error ? <p className="alert">{error}</p> : null}

      <Panel
        title="Status scanner"
        meta={
          data
            ? `${available} dari ${scanners.length} tool tersedia · ${
                fromApiOnly ? "diperiksa dari container API" : "dilaporkan container worker"
              }`
            : "Memeriksa ketersediaan tool…"
        }
        flush
        className="mb-4"
      >
        {loading && !data ? (
          <p className="empty">Memeriksa scanner…</p>
        ) : (
          <>
            {fromApiOnly ? (
              <p className="panel-note">
                <TriangleAlert size={13} aria-hidden="true" />
                Worker belum melaporkan inventarisnya (mis. Redis tidak terjangkau), jadi
                hasil di bawah berasal dari container API yang memang tidak memuat tool.
              </p>
            ) : null}
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Scanner</th>
                    <th>Binary</th>
                    <th>Ketersediaan</th>
                  </tr>
                </thead>
                <tbody>
                  {scanners.map((scanner) => (
                    <tr key={scanner.name}>
                      <td className="cell-title">{scanner.name}</td>
                      <td className="cell-muted">{scanner.binary}</td>
                      <td>
                        <span
                          className={scanner.available ? "st st-ok" : "st st-fail"}
                        >
                          {scanner.available ? "Tersedia" : "Tidak tersedia"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {scanners.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty">
                        Tidak ada scanner terdaftar.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {data?.reported_at ? (
              <p className="panel-meta px-6 py-3">
                Dilaporkan {formatDateTime(data.reported_at)}
              </p>
            ) : null}
          </>
        )}
      </Panel>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Integrasi notifikasi"
          meta="Slack webhook (kanal Telegram belum tersedia)"
        >
          <div className="panel-body flex flex-col gap-3">
            <p className="panel-meta">
              Uji kirim pesan ke <code>SLACK_WEBHOOK_URL</code> bila sudah dikonfigurasi.
            </p>
            <button
              type="button"
              className="btn btn-ghost self-start"
              onClick={() => void testWebhook()}
              disabled={testing}
            >
              <Plug size={15} aria-hidden="true" />
              {testing ? "Mengirim…" : "Uji webhook"}
            </button>
            {webhookResult ? <pre className="code-block">{webhookResult}</pre> : null}
          </div>
        </Panel>

        <Panel title="Akun" meta="Sesi aktif di peramban ini">
          <div className="panel-body flex flex-col gap-3">
            <div className="field">
              <label>Email</label>
              <span className="cell-title">{identity ?? "—"}</span>
            </div>
            <div className="field">
              <label>Masa berlaku token</label>
              <span className="cell-muted">
                Dikelola server (saat ini 24 jam). Bila kedaluwarsa, Anda diminta masuk
                kembali.
              </span>
            </div>
            <div className="field">
              <label>Status API</label>
              <a
                className="cell-link"
                href={`${API_URL}/health`}
                target="_blank"
                rel="noreferrer"
              >
                {API_URL}/health
                <ExternalLink size={11} aria-hidden="true" className="ml-1 inline align-[-1px]" />
              </a>
            </div>
            <div className="field">
              <label>Dokumentasi</label>
              <a
                className="cell-link"
                href={`${API_URL}/docs`}
                target="_blank"
                rel="noreferrer"
              >
                {API_URL}/docs
                <ExternalLink size={11} aria-hidden="true" className="ml-1 inline align-[-1px]" />
              </a>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Belum tersedia" meta="Direncanakan pada roadmap, belum diimplementasikan">
        <div className="panel-body">
          <ul className="plain-list">
            <li>
              <ShieldCheck size={14} aria-hidden="true" />
              <span>
                <b>Notifikasi Telegram</b> — kanal utama yang diminta pada rencana (§16).
              </span>
            </li>
            <li>
              <ShieldCheck size={14} aria-hidden="true" />
              <span>
                <b>Triage &amp; rekomendasi berbasis LLM</b> — lapisan AI pada rencana (§15).
              </span>
            </li>
            <li>
              <ShieldCheck size={14} aria-hidden="true" />
              <span>
                <b>Diff antar-scan</b> — menandai aset/port baru dan yang hilang.
              </span>
            </li>
            <li>
              <ShieldCheck size={14} aria-hidden="true" />
              <span>
                <b>Penjadwalan per target</b> — kolom <code>schedule_cron</code> belum
                dipakai; saat ini semua target dipindai harian.
              </span>
            </li>
          </ul>
        </div>
      </Panel>
    </>
  );
}
