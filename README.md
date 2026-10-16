# SentinelASM

Platform **Attack Surface Management (ASM)** untuk tim SOC. Masukkan satu domain,
sistem mengotomasi:

**Discovery → Fingerprinting → Vulnerability Scanning → Risk Scoring → Reporting**

dilengkapi **dashboard manajemen** dan **continuous monitoring**.

> Rencana lengkap ada di [`PLAN_ASM.md`](./PLAN_ASM.md), konteks awal di [`plan.md`](./plan.md),
> dan dokumentasi teknis di [`docs/`](./docs).
>
> **API live:** <https://asm.ahyarni.my.id> (`/docs` untuk Swagger) — lihat
> [`docs/server-ct-asm.md`](./docs/server-ct-asm.md).
>
> **Dashboard live:** <https://asm-app.ahyarni.my.id> — login dengan akun admin.

---

## Fitur Utama

- **Asset Discovery** — enumerasi subdomain (pasif + aktif), resolusi DNS, port scanning, deteksi CDN/wildcard.
- **Fingerprinting** — deteksi teknologi (web server, CMS, framework) dan sertifikat TLS.
- **Vulnerability Scanning** — Nuclei templates, mapping versi → CVE, pemeriksaan miskonfigurasi.
- **Risk Scoring** — prioritas berdasarkan severity, keterpaparan, dan kemudahan eksploitasi.
- **Reporting** — laporan PDF/HTML/JSON/CSV (ringkasan eksekutif + detail teknis).
- **Management Dashboard** — 9 halaman (ikhtisar, target, aset, temuan, scan, laporan, pengaturan), progres scan per fase, dan status remediasi.
- **Alerting & Continuous Monitoring** — notifikasi **Telegram** (rencana) + webhook/email opsional + scan berkala.

---

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Backend API | Python + FastAPI |
| Task Queue | Celery + Redis |
| Scheduler | Celery Beat |
| Database | PostgreSQL |
| Scanning Engine | Subfinder, Amass, dnsx, naabu, httpx, tlsx, katana, nuclei, ffuf, dan lainnya (lihat [PLAN_ASM.md §14](./PLAN_ASM.md)) |
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Reporting | WeasyPrint |
| Deployment | Docker + Docker Compose |

---

## Tooling Open-Source

SentinelASM mengorkestrasi tool open-source terbaik di tiap tahap pipeline:

```
Subfinder/Amass → dnsx → naabu → httpx/tlsx → katana/gau → nuclei/ffuf → risk scoring
```

- **Discovery:** subfinder, amass, assetfinder, dnsx, puredns, shuffledns, alterx
- **Port & service:** naabu, masscan, nmap, rustscan
- **Fingerprint:** httpx, tlsx, whatweb, webanalyze
- **Crawl & URL:** katana, gau, waybackurls, gospider, paramspider, LinkFinder
- **Content discovery:** ffuf, feroxbuster, gobuster, dirsearch, kiterunner
- **Vulnerability scanning:** nuclei, OWASP ZAP, nikto, wpscan, joomscan, dalfox, sqlmap, openvas, trivy
- **TLS/SSL:** testssl.sh, sslyze, tlsx
- **Secret leak:** trufflehog, gitleaks
- **Screenshot:** gowitness, eyewitness, aquatone
- **Takeover & cloud:** subjack, cloud_enum, S3Scanner
- **Threat intel:** NVD, EPSS, ExploitDB, Vulners, Shodan/Censys

Detail lengkap tiap tool dan pola integrasinya ada di
[`PLAN_ASM.md` §14](./PLAN_ASM.md).

---

## Quickstart

1. Siapkan environment variable:

   ```bash
   cp .env.example .env
   # sesuaikan kredensial bila perlu
   ```

2. Jalankan seluruh service (compose ada di `deploy/`, dibungkus `make`):

   ```bash
   make up      # = docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
   make ps      # status container
   make logs    # ikuti log
   ```

3. Akses:

   - Frontend dashboard: <http://localhost:3000>
   - API docs (Swagger): <http://localhost:8000/docs>

4. Hentikan seluruh service:

   ```bash
   make down
   ```

> Tanpa `make`? Jalankan langsung:
> `docker compose --env-file .env -f deploy/docker-compose.yml up -d --build`.
> Untuk reverse proxy satu port: `make proxy-up` (<http://localhost:8080>).

---

## Struktur Proyek

```
.
├─ PLAN_ASM.md              # rencana lengkap
├─ plan.md                  # catatan awal
├─ README.md
├─ Makefile                 # helper perintah (up/down/logs/test/lint/...)
├─ .env.example
├─ docs/                    # architecture, deployment, development, api
├─ deploy/
│  ├─ docker-compose.yml    # stack (lihat PLAN_ASM.md §5)
│  ├─ nginx/                # reverse proxy opsional (profile "proxy")
│  └─ run-local.sh          # alternatif Podman tanpa compose
├─ backend/
│  ├─ app/
│  │  ├─ main.py            # entrypoint FastAPI
│  │  ├─ core/              # config & security
│  │  ├─ db/                # engine, session, tipe kolom
│  │  ├─ models/            # User, Target, Scan, Asset, Service, Finding
│  │  ├─ schemas/           # skema Pydantic
│  │  ├─ services/          # risk scoring, enrichment, reporting, storage
│  │  ├─ scanners/          # adapter subfinder, naabu, httpx, katana, gau,
│  │  │                     #   nuclei, testssl, dalfox, sqlmap, cloud_enum, zap
│  │  ├─ workers/           # celery_app + pipeline tasks
│  │  └─ api/v1/            # endpoint REST
│  ├─ alembic/              # migrasi database
│  ├─ tests/test_smoke.py   # uji end-to-end (SQLite + mock)
│  ├─ pyproject.toml        # metadata + konfigurasi ruff/pytest
│  ├─ Dockerfile            # image API (ringan)
│  ├─ Dockerfile.worker     # image worker + toolkit scanning
│  └─ requirements.txt
└─ frontend/
   ├─ app/                  # 9 rute: login, ikhtisar, targets(+[id]), assets, findings, scans, reports, settings
   ├─ components/           # AppShell, ScanProgress, tabel, panel, tombol
   ├─ lib/                  # api, types, ui, format, hooks, cn
   ├─ Dockerfile
   └─ package.json
```

---

## Status Implementasi

- [x] Model data (User, Target, Scan, Asset, Service, Finding, Report, CveCache)
- [x] Pipeline scanning (discovery → probe → crawl → vuln → active) + skor risiko
- [x] Adapter tool open-source: subfinder, naabu, httpx, nuclei, katana, gau, testssl
- [x] Adapter Tier 3 (opt-in `ENABLE_ACTIVE_SCANNING`): dalfox, sqlmap, cloud_enum, ZAP
- [x] Worker Celery + penjadwalan (Celery Beat)
- [x] Image worker berisi toolkit scanning (Dockerfile.worker)
- [x] REST API (auth, targets, scans, assets, findings, dashboard, reports, webhooks, system)
- [x] Migrasi database dengan Alembic
- [x] Object storage untuk artefak laporan (PDF/HTML) + endpoint unduh
- [x] Enrichment CVE/EPSS (NVD + FIRST EPSS, dengan cache)
- [x] Dashboard frontend minimal (login, target, scan, ringkasan, temuan)
- [x] Dashboard dipecah menjadi 9 halaman + progres scan real (fase, timer, error scanner)
- [x] Mode mock untuk demo tanpa memasang tool eksternal
- [ ] Notifikasi otomatis saat temuan baru (webhook/email) — belum dikerjakan

> Catatan: tool eksternal dipanggil bila tersedia di `PATH`. Image worker
> (`Dockerfile.worker`) sudah memasang semuanya; image API tetap ringan. Bila
> `MOCK_SCANNERS=true`, sistem memakai data contoh agar demo tetap berjalan.
> Scanner agresif hanya berjalan bila `ENABLE_ACTIVE_SCANNING=true`.

---

## Menjalankan Dengan Podman (tanpa Docker Compose)

Jika Docker/compose tidak tersedia tetapi Podman ada:

```bash
./deploy/run-local.sh --build   # build semua image lalu jalankan
./deploy/run-local.sh           # jalankan stack yang sudah dibangun
./deploy/run-local.sh --down    # hentikan
```

- Dashboard: <http://localhost:3000>
- API docs:  <http://localhost:18000/docs> (port 8000 sering terpakai proses lain)

---

## Menjalankan Tanpa Docker (dev)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# butuh PostgreSQL + Redis, atau set DATABASE_URL ke sqlite untuk uji cepat
uvicorn app.main:app --reload
```

Uji end-to-end cepat (tanpa Postgres/Redis):

```bash
cd backend
python tests/test_smoke.py
```

---

## Catatan Legalitas

SentinelASM melakukan pemindaian **aktif**. Hanya gunakan pada:

- Aset milik sendiri, atau
- Aset yang Anda memiliki **izin tertulis** untuk diuji, atau
- Lingkungan lab / domain latihan.

Sediakan mekanisme verifikasi kepemilikan domain (mis. TXT record) sebelum
scan produksi dijalankan.
