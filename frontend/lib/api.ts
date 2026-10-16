// SentinelASM API client

import type {
  Asset,
  AssetDetail,
  Finding,
  FindingStatus,
  Report,
  Scan,
  ScannerStatus,
  Summary,
  Target,
  TokenResponse,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "sentinelasm_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

/** Identitas dari klaim JWT (untuk ditampilkan di nav). Null bila token tak terbaca. */
export function getIdentity(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(normalized)) as { sub?: string; email?: string };
    return json.email ?? json.sub ?? null;
  } catch {
    return null;
  }
}

/** Error HTTP dengan status, supaya pemanggil bisa membedakan 401 dari error lain. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;

/** Dipasang dashboard: dipanggil saat request ber-token ditolak 401 (sesi kedaluwarsa). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** Bangun query string, melewati nilai kosong. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

const DETAIL_MSG = (body: { detail?: unknown }): string | null => {
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) {
    const parts = body.detail
      .map((item) => (item as { msg?: string })?.msg)
      .filter((msg): msg is string => typeof msg === "string");
    if (parts.length > 0) return parts.join("; ");
  }
  return null;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    // Hanya request yang benar-benar membawa token yang boleh memicu logout.
    if (res.status === 401 && token) onUnauthorized?.();
    // Tampilkan pesan yang bisa dibaca manusia, bukan JSON mentah dari server.
    let message = text || `Permintaan gagal (${res.status})`;
    try {
      message = DETAIL_MSG(JSON.parse(text) as { detail?: unknown }) ?? message;
    } catch {
      /* body bukan JSON — pakai teks apa adanya */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type AssetQuery = { target_id?: number; search?: string };
type FindingQuery = {
  asset_id?: number;
  target_id?: number;
  severity?: string;
  status?: string;
};

export const api = {
  // --- auth ---
  async login(email: string, password: string): Promise<TokenResponse> {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new ApiError(res.status, "Login gagal");
    const data = (await res.json()) as TokenResponse;
    setToken(data.access_token);
    return data;
  },
  register: (email: string, password: string) =>
    request<unknown>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // --- dashboard ---
  summary: () => request<Summary>("/dashboard/summary"),

  // --- targets ---
  targets: () => request<Target[]>("/targets"),
  createTarget: (domain: string) =>
    request<Target>("/targets", {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),
  deleteTarget: (id: number) =>
    request<void>(`/targets/${id}`, { method: "DELETE" }),
  scanTarget: (id: number) =>
    request<Scan>(`/targets/${id}/scan`, { method: "POST" }),

  // --- scans ---
  scansForTarget: (targetId: number) =>
    request<Scan[]>(`/targets/${targetId}/scans`),
  scans: (limit = 100) => request<Scan[]>(`/scans${qs({ limit })}`),
  scan: (id: number) => request<Scan>(`/scans/${id}`),

  // --- assets ---
  assets: (params: AssetQuery = {}) =>
    request<Asset[]>(`/assets${qs({ ...params })}`),
  asset: (id: number) => request<AssetDetail>(`/assets/${id}`),

  // --- findings ---
  findings: (params: FindingQuery = {}) =>
    request<Finding[]>(`/findings${qs({ ...params })}`),
  updateFinding: (id: number, status: FindingStatus) =>
    request<Finding>(`/findings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // --- reports ---
  reports: (params: { target_id?: number } = {}) =>
    request<Report[]>(`/reports${qs({ ...params })}`),
  createReport: (targetId: number, kind: "pdf" | "html" = "pdf") =>
    request<Report>(`/reports/target/${targetId}${qs({ kind })}`, {
      method: "POST",
    }),
  async downloadReport(reportId: number, kind: string) {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/v1/reports/${reportId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      if (res.status === 401) onUnauthorized?.();
      throw new ApiError(res.status, `Gagal mengunduh laporan (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentinelasm_report.${kind}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // --- system ---
  scanners: () => request<ScannerStatus>("/system/scanners"),
  webhookTest: () => request<Record<string, unknown>>("/webhooks/test", {
    method: "POST",
  }),
};
