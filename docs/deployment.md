# Deployment SentinelASM

Ada tiga cara menjalankan: **Docker Compose** (disarankan), **Podman** (tanpa compose),
dan **server pribadi / VPS**.

---

## 0. Prasyarat umum

- Salin environment: `cp .env.example .env` lalu sesuaikan:
  - `SECRET_KEY` — ganti dengan string acak panjang.
  - `POSTGRES_PASSWORD` — jangan biarkan default `sentinel` di server publik.
  - `NEXT_PUBLIC_API_URL` — URL API yang bisa diakses browser (mis. `https://api.domainmu.com`).
  - `MOCK_SCANNERS` — `false` untuk scan nyata, `true` untuk demo.
  - `ENABLE_ACTIVE_SCANNING` — biarkan `false` kecuali butuh scanner agresif (dalfox/sqlmap/ZAP).

---

## 1. Docker Compose (disarankan)

Compose berada di `deploy/` (lihat [PLAN_ASM.md §5](../PLAN_ASM.md)). Jalankan dari root repo:

```bash
make up            # setara: docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
make ps            # status
make logs          # ikuti log
make down          # hentikan
```

Akses:

- Dashboard: <http://localhost:3000>
- API docs: <http://localhost:8000/docs>

Reverse proxy nginx (opsional, agar satu port):

```bash
make proxy-up      # http://localhost:8080
```

---

## 2. Podman (tanpa Docker Compose)

```bash
./deploy/run-local.sh --build   # build semua image lalu jalankan
./deploy/run-local.sh           # jalankan stack yang sudah dibangun
./deploy/run-local.sh --down    # hentikan
```

- Dashboard: <http://localhost:3000>
- API docs: <http://localhost:18000/docs>

---

## 3. Server pribadi / VPS

### 3.1 Rekomendasi topologi

| Komponen | Di mana | Catatan |
|---|---|---|
| `backend` (FastAPI) | Server | Bisa diakses publik via HTTPS |
| `worker` + `beat` | Server | CPU/network cukup; boleh server sama |
| `postgres` + `redis` | Server | **Jangan** expose ke internet; cukup jaringan internal Docker |
| `artifacts` | Volume server | Bisa diganti S3/MinIO nanti |
| `frontend` (Next.js) | Server (via nginx) **atau** Vercel | Kalau Vercel: set `NEXT_PUBLIC_API_URL` ke `https://api.domainmu.com` |

> Catatan: pipeline scan jalan di `worker`, jadi backend ringan; server kecil (2 vCPU / 4 GB)
> sudah cukup untuk pemakaian satu tim. Untuk scan `Deep` paralel, naikkan CPU.

### 3.2 Langkah deploy (Ubuntu/Debian)

```bash
# 1) Di server: pasang Docker + compose plugin
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER   # logout/login agar berlaku

# 2) Ambil kode (git clone kalau repo sudah di-remote, atau rsync/scp dari laptop)
git clone <repo-url> sentinelasm && cd sentinelasm

# 3) Konfigurasi
cp .env.example .env
$EDITOR .env      # set SECRET_KEY, POSTGRES_PASSWORD, NEXT_PUBLIC_API_URL, MOCK_SCANNERS=false

# 4) Nyalakan
make up
make ps
```

### 3.3 Domain + HTTPS

Contoh dengan Caddy (paling sederhana, TLS otomatis) di depan nginx:

```
# /etc/caddy/Caddyfile
api.domainmu.com {
    reverse_proxy 127.0.0.1:8000
}
app.domainmu.com {
    reverse_proxy 127.0.0.1:3000
}
```

Arahkan DNS `A record` `api` dan `app` ke IP server, lalu:

```bash
sudo systemctl reload caddy
```

Set `NEXT_PUBLIC_API_URL=https://api.domainmu.com` di `.env`, lalu `make up` ulang.

Alternatif nginx + certbot tersedia pada `deploy/nginx/sentinelasm.conf` (tambahkan blok 443).

### 3.4 Firewall & hardening

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
```

- **Jangan** buka 5432 (Postgres) atau 6379 (Redis) ke publik.
- Ganti `POSTGRES_PASSWORD` dan `SECRET_KEY` sebelum go-live.
- Aktifkan autentikasi API (sudah default) dan batasi pembuatan akun bila perlu.
- Pertimbangkan `fail2ban` untuk SSH dan endpoint login.

### 3.5 Status deployment nyata

Sudah dijalankan: LXC `ct-asm` di host Proxmox pribadi. API diekspos lewat Cloudflare
Tunnel di `https://asm.ahyarni.my.id`, dan dashboard Next.js di
`https://asm-app.ahyarni.my.id` (profile compose `web`). Rincian lengkap (topologi,
batas memori, ingress, prosedur update): **[server-ct-asm.md](./server-ct-asm.md)**.

---

## 4. Update & backup

```bash
git pull && make up            # update
make shell-db                  # psql; backup: pg_dump
docker volume ls               # volume: pgdata, redisdata, artifacts
```

Backup rutin: dump Postgres + salin volume `artifacts`.
