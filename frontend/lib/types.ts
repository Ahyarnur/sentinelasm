// Tipe data bersama untuk dashboard SentinelASM.

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingStatus = "open" | "in_progress" | "resolved" | "false_positive";

export type Summary = {
  targets: number;
  assets: number;
  findings: number;
  severity_counts: Record<string, number>;
};

export type Target = {
  id: number;
  domain: string;
  scope_verified: boolean;
  schedule_cron: string | null;
  created_at: string;
};

export type Asset = {
  id: number;
  target_id: number;
  host: string;
  ip: string | null;
  created_at: string;
};

export type Service = {
  id: number;
  port: number;
  protocol: string;
  name: string | null;
  version: string | null;
  technologies: unknown[];
  tls: Record<string, unknown>;
};

export type AssetDetail = Asset & { services: Service[] };

export type Finding = {
  id: number;
  asset_id: number;
  source: string;
  severity: Severity;
  title: string;
  description: string;
  cve: string | null;
  evidence: string;
  confidence: string;
  status: FindingStatus;
  created_at: string;
};

export type ScanSummary = {
  assets?: number;
  services?: number;
  endpoints?: number;
  findings?: number;
  active?: number;
  enriched?: number;
  findings_total?: number;
  scanner_errors?: string[];
  error?: string;
  note?: string;
};

export type Scan = {
  id: number;
  target_id: number;
  kind: string;
  status: string;
  phase: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
  summary: ScanSummary;
};

export type Report = {
  id: number;
  target_id: number;
  kind: string;
  path: string;
  created_at: string;
};

export type ScannerInfo = {
  name: string;
  binary: string;
  available: boolean;
};

export type ScannerStatus = {
  /** "worker" bila laporan berasal dari container worker, "api" bila cadangan lokal. */
  source: "worker" | "api";
  reported_at?: string;
  scanners: ScannerInfo[];
};

/** Bentuk balasan /auth/login. */
export type TokenResponse = {
  access_token: string;
  token_type: string;
};
