// Pemformat tanggal, durasi, dan angka untuk tampilan berbahasa Indonesia.

const TZ = "Asia/Jakarta";

/**
 * Backend menyimpan waktu dalam UTC. PostgreSQL mengembalikannya dengan penanda
 * zona (`+00:00`), tetapi SQLite mengembalikannya polos. Tanpa penambahan "Z",
 * `new Date("2026-10-16T08:17:28")` dianggap waktu lokal dan seluruh tampilan
 * waktu bergeser sebesar offset zona pengguna.
 */
function parseApiDate(value: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TZ,
  });
}

export function formatClock(value?: string | null): string {
  if (!value) return "—";
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TZ,
  });
}

/** "2m 14s" / "45s" / "1j 3m" — dipakai untuk durasi dan timer berjalan. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Jarak antara dua waktu ISO. Bila `end` kosong, pakai `now` (detik epoch). */
export function betweenSeconds(
  start?: string | null,
  end?: string | null,
  now?: number,
): number | null {
  if (!start) return null;
  const from = parseApiDate(start).getTime();
  if (Number.isNaN(from)) return null;
  const to = end ? parseApiDate(end).getTime() : (now ?? Date.now());
  if (Number.isNaN(to)) return null;
  return Math.max(0, (to - from) / 1000);
}
