# Deploy SentinelASM — server pribadi (Proxmox)

Catatan deployment nyata (backend + database) di server pribadi. Untuk konsep umum
lihat [`deployment.md`](./deployment.md).

## Ringkasan

| Item | Nilai |
|---|---|
| API publik | **https://asm.ahyarni.my.id** (`/health`, `/docs`) |
| Dashboard publik | **https://asm-app.ahyarni.my.id** |
| Host Proxmox | `pve` — `192.168.18.30` (PVE 9.2.21, Debian 13) |
| Container app | LXC **110 `ct-asm`** — `192.168.18.105` (unprivileged, nesting+keyctl) |
| Spesifikasi | 3 vCPU, 3072 MB RAM, 2048 MB swap, disk 40 GB (`local-lvm`) |
| Direktori app | `/opt/sentinelasm` (di dalam `ct-asm`) |
| Database | PostgreSQL 16 (container, port hanya internal) |
| Cache/queue | Redis 7 (container, port hanya internal) |
| Ingress publik | Cloudflare Tunnel di LXC `ct-tunnel` (102) |

Komponen yang berjalan di server: `postgres`, `redis`, `backend`, `worker`, `beat`,
plus **`frontend`** (dashboard Next.js). Frontend berada di profile compose `web`, jadi
diaktifkan eksplisit:

```bash
$DC --profile web up -d --build     # semua, termasuk dashboard
$DC up -d                           # backend + DB saja (tanpa dashboard)
```

Dashboard dibangun dengan `NEXT_PUBLIC_API_URL=https://asm.ahyarni.my.id` (nilai ini
"dibakar" ke bundle klien saat **build**, bukan saat run) dan diakses lewat
`https://asm-app.ahyarni.my.id`.

## Kenapa container terpisah?

Host hanya 7.5 GB RAM dan `ct-docker` (2 GB) sudah menjalankan aplikasi produksi
lain (owncloud, homepage, dsb.). `ct-asm` memisahkan beban scanning supaya tidak
mengganggu layanan tersebut.

## Batas memori

`compose` memberi batas per service agar satu proses tidak menghabiskan RAM container:

| Service | `mem_limit` | Env override |
|---|---|---|
| postgres | 768m | `POSTGRES_MEM_LIMIT` |
| redis | 256m | `REDIS_MEM_LIMIT` |
| backend | 512m | `BACKEND_MEM_LIMIT` |
| worker | 1400m | `WORKER_MEM_LIMIT` |
| beat | 192m | `BEAT_MEM_LIMIT` |
| frontend | 384m | `FRONTEND_MEM_LIMIT` |

## Operasi sehari-hari

```bash
# dari laptop (LAN sama) atau dari dalam ct-asm
ssh root@192.168.18.105

cd /opt/sentinelasm
DC="docker compose --env-file .env -f deploy/docker-compose.yml"

$DC ps                          # status
$DC logs -f backend             # log API
$DC logs -f worker              # log scanner
$DC logs -f frontend            # log dashboard
$DC --profile web up -d         # nyalakan/refresh semua (backend+DB+dashboard)
$DC up -d                       # backend+DB saja
$DC down                        # hentikan
```

Atau lewat Makefile (sama saja, lebih pendek): `make ps`, `make logs`, `make up-server`
(backend saja), `make up` (termasuk dashboard).

## Ingress Cloudflare Tunnel

File `/etc/cloudflared/config.yml` di LXC `ct-tunnel`:

```yaml
  - hostname: asm.ahyarni.my.id
    service: http://192.168.18.105:8000
  - hostname: asm-app.ahyarni.my.id
    service: http://192.168.18.105:3000
```

`asm.` → API (8000), `asm-app.` → dashboard (3000). DNS record dibuat otomatis:

```bash
cloudflared tunnel route dns ddad440f-6fb1-4976-8991-0cee2ff404ac asm.ahyarni.my.id
cloudflared tunnel route dns ddad440f-6fb1-4976-8991-0cee2ff404ac asm-app.ahyarni.my.id
```

Backup config lama disimpan di `/etc/cloudflared/config.yml.bak.*`. Catatan: menambah
ingress lewat `sed` menyisipkan entri baru **sebelum** baris `http_status:404` (catch-all);
urutan antar hostname tidak penting karena tiap entri punya `hostname` sendiri.

## Akun & keamanan

- Registrasi publik **dimatikan** (`ALLOW_REGISTRATION=false`). Hanya *user pertama*
  (bootstrap) yang bisa dibuat lewat `/auth/register`; setelah itu endpoint mengembalikan
  `403 Registration is disabled`.
- Admin awal: `admin@ahyarni.my.id` (role `admin`). **Password tidak ditulis di repo** —
  disimpan terpisah dan disampaikan lewat kanal aman. Ganti sesegera mungkin.
- `SECRET_KEY` dan `POSTGRES_PASSWORD` di-generate acak (`openssl rand -hex ...`) saat
  deploy dan hanya ada di `/opt/sentinelasm/.env` (mode 600).
- Postgres (5432) & Redis (6379) dipublikasikan ke host `ct-asm` saja; jangan pernah
  meneruskan port itu lewat tunnel.
- **CORS wajib memuat origin dashboard.** `CORS_ORIGINS` di `/opt/sentinelasm/.env` harus
  berisi `https://asm-app.ahyarni.my.id`, kalau tidak browser akan memblokir panggilan
  dari dashboard ke API. Setelah mengubah `.env`, recreate `backend` (mis.
  `$DC up -d backend`) agar nilai baru dipakai.
- Kredensial `root@pam` Proxmox sebaiknya **diganti** dan diganti dengan **API token**
  khusus untuk otomatisasi.

## Prosedur update

```bash
# 1) dari laptop: paket ulang repo (kecuali artefak build) lalu unggah
tar czf /tmp/sentinelasm.tgz \
  --exclude='./frontend/node_modules' --exclude='./frontend/.next' \
  --exclude='./backend/.venv' --exclude='./backend/artifacts' \
  --exclude='__pycache__' --exclude='*.db' --exclude='./.git' .

# 2) kirim ke ct-asm (langsung lewat LAN, tanpa perantara host)
scp /tmp/sentinelasm.tgz root@192.168.18.105:/root/

# 3) di ct-asm
cd /opt/sentinelasm && tar xzf /root/sentinelasm.tgz -C /opt/sentinelasm
$DC build backend worker && $DC up -d          # backend saja
$DC --profile web up -d --build                # kalau frontend ikut berubah
```

Migrasi database dijalankan otomatis oleh perintah `backend` (`alembic upgrade head`).

Recreate frontend **hanya perlu** bila kode frontend atau `NEXT_PUBLIC_API_URL` berubah —
karena nilainya di-embed saat build, mengubah env tanpa rebuild tidak akan berpengaruh.

## Catatan build image

- `backend/Dockerfile` — image ringan (FastAPI). Cepat dibangun.
- `frontend/Dockerfile` — multi-stage `node:22-alpine`: `npm ci` → `next build` →
  `next start`. `NEXT_PUBLIC_API_URL` disuntik sebagai **build arg** dari `compose`.
  Stage `runner` tidak menyalin `next.config.mjs`; untuk proyek ini aman karena
  konfigurasinya hanya `reactStrictMode` (tidak berpengaruh di produksi). Kalau nanti
  `next.config.mjs` dipakai untuk hal esensial (mis. `output`, `rewrites`), tambahkan
  baris `COPY --from=builder /app/next.config.mjs ./` di stage runner.
- `backend/Dockerfile.worker` — image scanner. Berat: membangun 9 tool Go lewat
  stage `golang:1.26-bookworm` (multi-stage, `CGO_ENABLED=0`), plus `default-jre-headless`
  untuk ZAP. Di CPU i3-8145U butuh puluhan menit dan banyak disk.
  - Kenapa multi-stage: Debian bookworm hanya punya Go 1.19, sedangkan tool
    ProjectDiscovery butuh Go >= 1.24.
  - **Jebakan `httpx`:** paket Python `httpx` (dipakai API) memasang console script
    bernama `httpx` di `/usr/local/bin`, yang akan **menimpa** binary ProjectDiscovery
    `httpx`. Karena itu `COPY --from=gotools /go/bin/ /usr/local/bin/` harus berada
    **setelah** `pip install`. Verifikasi: `head -c 4 /usr/local/bin/httpx` harus
    menghasilkan `ELF`, bukan `#!/usr/local/bin/python`.
  - Tool yang tersedia setelah build: `subfinder`, `dnsx`, `naabu`, `httpx`, `katana`,
    `nuclei` (v3.11.1), `gau`, `dalfox`, `ffuf`, `testssl.sh`, `sqlmap`, `cloud_enum`,
    `nmap`, `zap-baseline.py` (ZAP di `/opt/zap`).
