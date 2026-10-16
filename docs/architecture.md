# Arsitektur SentinelASM

## Ringkasan

SentinelASM menerima satu domain lalu mengotomasi: discovery -> fingerprinting ->
vulnerability scanning -> risk scoring -> reporting, dengan dashboard manajemen dan
continuous monitoring (lihat [PLAN_ASM.md](../PLAN_ASM.md)).

## Komponen

```
 Next.js Dashboard --REST--> FastAPI (auth, targets, scans, assets, findings, reports)
                                |            |             |
                           PostgreSQL     Redis        Artifacts (FS/S3)
                                          (broker + cache)
                                              |
                              Celery Worker + Celery Beat (scheduler)
                                              |
                        Scanner adapters: subfinder, naabu, httpx, katana,
                        gau, nuclei, testssl, dalfox, sqlmap, cloud_enum, zap
                                              |
                          Enrichment (NVD CVE, FIRST EPSS) -> Risk scoring
```

### Peta direktori (backend)

| Folder | Tanggung jawab |
|---|---|
| `app/api/v1/` | Endpoint REST (auth, targets, scans, assets, findings, dashboard, reports, webhooks, system) |
| `app/core/` | Konfigurasi (`config.py`) dan keamanan/JWT (`security.py`) |
| `app/db/` | Engine, session, tipe kolom kustom |
| `app/models/` | Model SQLAlchemy: User, Target, Scan, Asset, Service, Finding, Report, CveCache |
| `app/schemas/` | Skema Pydantic untuk request/response |
| `app/services/` | Logika bisnis: `risk.py`, `enrichment.py`, `reporting.py`, `storage.py` |
| `app/scanners/` | Adapter tool eksternal + `registry.py` |
| `app/workers/` | `celery_app.py` + `tasks.py` (pipeline) |

### Peta direktori (frontend)

| Folder | Tanggung jawab |
|---|---|
| `app/` | Halaman Next.js (App Router) — `layout.tsx`, `page.tsx` |
| `components/` | Komponen UI: `StatCard`, `SeverityChart`, `TargetTable`, `FindingsTable`, `AuthForm`, `SeverityBadge` |
| `lib/` | `api.ts` (klien API), `types.ts` (tipe), `ui.ts` (warna/label) |

## Pipeline scan

```
discovery (subfinder) -> probe (naabu, httpx) -> crawl (katana, gau)
   -> vulnscan (nuclei, testssl) -> active (opsional: dalfox, sqlmap, cloud_enum, zap)
   -> enrichment (CVE/EPSS) -> risk scoring -> report
```

Antrean Celery: `discovery`, `fingerprint`, `vulnscan`, `report`.

- Setiap adapter mengembalikan data ternormalisasi (asset/service/finding) dengan penanda
  `source`.
- Bila tool tidak ada di `PATH`, adapter di-skip; bila `MOCK_SCANNERS=true` sistem memakai
  data contoh agar demo tetap berjalan.
- Scanner agresif hanya berjalan bila `ENABLE_ACTIVE_SCANNING=true`.

## Skema data inti

- `targets` — domain yang dipantau + status verifikasi scope.
- `assets` — hasil discovery (subdomain/IP/port) milik target.
- `services` — layanan terdeteksi per aset (port, teknologi, TLS).
- `findings` — temuan (severity, CVE, bukti, status remediasi) + skor risiko.
- `scans` — catatan eksekusi scan (status, waktu, ringkasan).
- `reports` — artefak laporan (PDF/HTML).
- `cve_cache` — cache metadata CVE/EPSS agar hemat rate limit.
- `users` — akun & peran dasar.

## Yang belum ada (lihat PLAN_ASM.md)

- WebSocket progress real-time (saat ini polling tiap 4 detik saat ada scan berjalan).
- Diff antar scan.
- Notifikasi **Telegram** (saat ini webhook Slack).
- Lapisan **AI/LLM** (tokenizer.id).
