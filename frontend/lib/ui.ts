// Peta warna & label untuk elemen UI (severity, status scan).

export const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-green-400",
  info: "text-slate-400",
};

export const SEVERITY_FILL: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#facc15",
  low: "#4ade80",
  info: "#94a3b8",
};

export const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

export const SCAN_LABEL: Record<string, { text: string; className: string }> = {
  queued: { text: "Menunggu", className: "text-slate-400" },
  running: { text: "Berjalan...", className: "text-sky-400" },
  completed: { text: "Selesai", className: "text-green-400" },
  completed_with_errors: {
    text: "Selesai (ada peringatan)",
    className: "text-yellow-400",
  },
  failed: { text: "Gagal", className: "text-red-400" },
  interrupted: { text: "Terputus", className: "text-orange-400" },
};
