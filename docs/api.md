# API SentinelASM (ringkas)

Base path: `/api/v1`. Autentikasi: Bearer JWT (kecuali register/login).
Dokumentasi interaktif lengkap: `/docs` (Swagger) dan `/redoc`.

## Auth

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/auth/register` | Daftar akun |
| POST | `/auth/login` | Login, mengembalikan `access_token` |

## Targets

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/targets` | Daftar target |
| POST | `/targets` | Tambah target (domain) |
| DELETE | `/targets/{id}` | Hapus target |
| POST | `/targets/{id}/scan` | Memicu scan |

## Scans

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/targets/{id}/scans` | Riwayat scan sebuah target |
| GET | `/scans` | Riwayat scan seluruh target (terbaru dulu, `?limit=`, maks 500) |
| GET | `/scans/{id}` | Detail scan |

Setiap scan memuat `status`, `phase` (`discovery` → `probe` → `crawl` → `vuln` →
`active` → `enrich`, kosong saat tidak berjalan), `started_at`, `finished_at`, dan
`summary` (hitungan ditulis bertahap per fase, plus `scanner_errors` / `error`).

## Assets

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/assets` | Daftar aset (filter opsional) |
| GET | `/assets/{id}` | Detail aset (service, port, TLS) |

## Findings

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/findings` | Daftar temuan (filter `asset_id`, `target_id`, `severity`, `status`) |
| PATCH | `/findings/{id}` | Update status remediasi |

## Reports

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/reports` | Daftar laporan |
| POST | `/reports/target/{id}?kind=pdf\|html` | Buat laporan |
| GET | `/reports/target/{id}` | Laporan HTML inline |
| GET | `/reports/{id}/download` | Unduh file laporan |

## Dashboard & sistem

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/dashboard/summary` | Ringkasan postur risiko |
| GET | `/system/scanners` | Status ketersediaan scanner (inventaris dari container `worker` via Redis; jatuh ke pengecekan lokal bila belum ada laporan) |
| POST | `/webhooks/test` | Uji konfigurasi notifikasi |

## Belum diimplementasikan (lihat PLAN_ASM.md §13)

`/auth/refresh`, `/auth/change-password`, `POST /scans/{id}/cancel`,
`/scans/{id}/diff`, `/assets/graph`, `/findings/{id}/comments`,
`/findings/{id}/ai-explain`, `/dashboard/trends`, `/schedules`, `/users`,
`/settings/ai`, `/audit-logs`, `/integrations/telegram/test`, dan WebSocket
`/ws/scans/{id}`.
