// Peta token & label untuk elemen UI (severity, status scan, fase).
// Semua warna menunjuk token di app/globals.css — komponen tidak memuat hex.

export const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

export const SEVERITY_LABEL: Record<string, string> = {
  critical: "Kritis",
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
  info: "Info",
};

export function severityLabel(severity: string): string {
  return SEVERITY_LABEL[severity] ?? severity;
}

/** Kelas chip (tint + ink) untuk badge severity. */
export const SEVERITY_CHIP: Record<string, string> = {
  critical: "chip chip-critical",
  high: "chip chip-high",
  medium: "chip chip-medium",
  low: "chip chip-low",
  info: "chip chip-info",
};

/** Token warna bar (muka + bevel atas) untuk grafik distribusi. */
export const SEVERITY_BAR: Record<string, { face: string; top: string }> = {
  critical: { face: "var(--sev-critical)", top: "var(--sev-critical-top)" },
  high: { face: "var(--sev-high)", top: "var(--sev-high-top)" },
  medium: { face: "var(--sev-medium)", top: "var(--sev-medium-top)" },
  low: { face: "var(--sev-low)", top: "var(--sev-low-top)" },
  info: { face: "var(--sev-info)", top: "var(--sev-info-top)" },
};

export const SCAN_LABEL: Record<string, { text: string; className: string }> = {
  queued: { text: "Menunggu", className: "st st-idle" },
  running: { text: "Berjalan", className: "st st-run" },
  completed: { text: "Selesai", className: "st st-ok" },
  completed_with_errors: { text: "Selesai (peringatan)", className: "st st-warn" },
  failed: { text: "Gagal", className: "st st-fail" },
  interrupted: { text: "Terputus", className: "st st-fail" },
};

export const SCAN_IDLE = { text: "Belum discan", className: "st st-idle" };

export function scanLabel(status: string | undefined | null) {
  if (!status) return SCAN_IDLE;
  return SCAN_LABEL[status] ?? { text: status, className: "st st-idle" };
}

/**
 * Urutan fase di worker (lihat backend/app/workers/tasks.py). Dipakai untuk
 * menampilkan progres nyata — bukan persentase karangan.
 */
export const SCAN_PHASES = [
  { key: "discovery", label: "Discovery", hint: "subdomain & host" },
  { key: "probe", label: "Fingerprint", hint: "port, layanan, TLS" },
  { key: "crawl", label: "Crawl", hint: "endpoint & URL" },
  { key: "vuln", label: "Vuln scan", hint: "nuclei, testssl" },
  { key: "active", label: "Active scan", hint: "dalfox, sqlmap, ZAP" },
  { key: "enrich", label: "Enrich", hint: "data pendukung" },
] as const;

export function phaseIndex(phase: string | null | undefined): number {
  if (!phase) return -1;
  return SCAN_PHASES.findIndex((p) => p.key === phase);
}

export function phaseLabel(phase: string | null | undefined): string {
  const index = phaseIndex(phase);
  return index >= 0 ? SCAN_PHASES[index].label : "—";
}

export const FINDING_STATUS_LABEL: Record<string, string> = {
  open: "Terbuka",
  in_progress: "Dikerjakan",
  resolved: "Selesai",
  false_positive: "False positive",
};

export const FINDING_STATUS_ORDER = [
  "open",
  "in_progress",
  "resolved",
  "false_positive",
] as const;

export const FINDING_STATUS_CHIP: Record<string, string> = {
  open: "chip chip-critical",
  in_progress: "chip chip-medium",
  resolved: "chip chip-low",
  false_positive: "chip chip-plain",
};

export const ACTIVE_SCAN_STATUSES = ["queued", "running"];

export function isScanActive(status: string | undefined | null): boolean {
  return !!status && ACTIVE_SCAN_STATUSES.includes(status);
}

/** Peta id -> objek, untuk pencarian cepat tanpa Map. */
export function indexBy<T extends { id: number }>(items: T[]): Record<number, T> {
  const map: Record<number, T> = {};
  for (const item of items) map[item.id] = item;
  return map;
}

/** Peta id aset -> nama host, dipakai tabel temuan & riwayat scan. */
export function hostById(assets: { id: number; host: string }[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const asset of assets) map[asset.id] = asset.host;
  return map;
}

/** Peta id target -> domain. */
export function domainById(targets: { id: number; domain: string }[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const target of targets) map[target.id] = target.domain;
  return map;
}
