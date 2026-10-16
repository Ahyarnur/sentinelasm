// Peta token & label untuk elemen UI (severity, status scan).
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
