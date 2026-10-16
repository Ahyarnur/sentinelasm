// Tipe data bersama untuk dashboard SentinelASM.

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
};

export type Finding = {
  id: number;
  severity: string;
  title: string;
  cve: string | null;
  source: string;
};

export type ScanInfo = {
  id: number;
  status: string;
  summary: Record<string, unknown>;
  finished_at: string | null;
};

export type ReportRef = {
  id: number;
  kind: string;
  target_id: number;
};
