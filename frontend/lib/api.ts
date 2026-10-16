// SentinelASM API client

const API_URL =
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
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  async login(email: string, password: string) {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error("Login gagal");
    const data = (await res.json()) as { access_token: string };
    setToken(data.access_token);
    return data;
  },
  register: (email: string, password: string) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  summary: () => request<any>("/dashboard/summary"),
  targets: () => request<any[]>("/targets"),
  createTarget: (domain: string) =>
    request("/targets", { method: "POST", body: JSON.stringify({ domain }) }),
  scanTarget: (id: number) =>
    request(`/targets/${id}/scan`, { method: "POST" }),
  findings: () => request<any[]>("/findings"),
  scans: (id: number) => request<any[]>(`/targets/${id}/scans`),
  createReport: (id: number) =>
    request<{ id: number; kind: string; target_id: number }>(
      `/reports/target/${id}?kind=pdf`,
      { method: "POST" },
    ),
  async downloadReport(reportId: number, kind: string) {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/v1/reports/${reportId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Gagal mengunduh laporan (${res.status})`);
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
};
