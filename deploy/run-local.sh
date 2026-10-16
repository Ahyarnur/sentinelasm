#!/usr/bin/env bash
#
# Jalankan SentinelASM dengan Podman (tanpa docker compose).
#
#   ./deploy/run-local.sh            # jalankan stack
#   ./deploy/run-local.sh --build    # build image dulu, lalu jalankan
#   ./deploy/run-local.sh --down     # hentikan dan hapus container
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NET="${NET:-sentinelasm}"
API_PORT="${API_PORT:-18000}"
WEB_PORT="${WEB_PORT:-3000}"
DB_USER="${DB_USER:-sentinel}"
DB_PASS="${DB_PASS:-sentinel}"
DB_NAME="${DB_NAME:-sentinelasm}"
SECRET_KEY="${SECRET_KEY:-dev-secret-change-me}"

# Scanning behaviour
MOCK_SCANNERS="${MOCK_SCANNERS:-false}"
ENABLE_ACTIVE_SCANNING="${ENABLE_ACTIVE_SCANNING:-false}"
PORT_SCAN_TOP="${PORT_SCAN_TOP:-1000}"
NUCLEI_SEVERITY="${NUCLEI_SEVERITY:-critical,high,medium}"

DB_URL="postgresql+psycopg://${DB_USER}:${DB_PASS}@postgres:5432/${DB_NAME}"
REDIS_URL="redis://redis:6379/0"
API_URL="http://localhost:${API_PORT}"
ARTIFACT_VOL="${ARTIFACT_VOL:-sentinelasm-artifacts}"
ARTIFACT_DIR="/app/artifacts"

# Scanner env shared by the worker and beat.
SCAN_ENV=(-e "MOCK_SCANNERS=${MOCK_SCANNERS}"
  -e "ENABLE_ACTIVE_SCANNING=${ENABLE_ACTIVE_SCANNING}"
  -e "PORT_SCAN_TOP=${PORT_SCAN_TOP}"
  -e "NUCLEI_SEVERITY=${NUCLEI_SEVERITY}")

usage() { grep -E '^# ' "$0" | sed 's/^# \{0,1\}//'; }

case "${1:-}" in
  --down)
    for c in sentinelasm-backend sentinelasm-worker sentinelasm-beat sentinelasm-frontend postgres redis; do
      podman rm -f "$c" >/dev/null 2>&1 || true
    done
    podman network rm "$NET" >/dev/null 2>&1 || true
    echo "SentinelASM dihentikan."
    exit 0
    ;;
  -h|--help) usage; exit 0 ;;
esac

podman network exists "$NET" >/dev/null 2>&1 || podman network create "$NET" >/dev/null

if [[ "${1:-}" == "--build" ]]; then
  echo ">> build image API + worker + frontend"
  podman build -t sentinelasm-backend:latest "$ROOT/backend"
  podman build -t sentinelasm-worker:latest -f "$ROOT/backend/Dockerfile.worker" "$ROOT/backend"
  podman build -t sentinelasm-frontend:latest --build-arg NEXT_PUBLIC_API_URL="$API_URL" "$ROOT/frontend"
fi

echo ">> postgres + redis"
podman rm -f postgres redis >/dev/null 2>&1 || true
podman volume create sentinelasm-pgdata >/dev/null 2>&1 || true
podman volume create sentinelasm-redisdata >/dev/null 2>&1 || true
podman volume create "$ARTIFACT_VOL" >/dev/null 2>&1 || true
podman run -d --name postgres --network "$NET" \
  -e POSTGRES_USER="$DB_USER" -e POSTGRES_PASSWORD="$DB_PASS" -e POSTGRES_DB="$DB_NAME" \
  -v sentinelasm-pgdata:/var/lib/postgresql/data \
  -p 5432:5432 docker.io/library/postgres:16-alpine >/dev/null
podman run -d --name redis --network "$NET" \
  -v sentinelasm-redisdata:/data \
  -p 6379:6379 docker.io/library/redis:7-alpine >/dev/null

for i in $(seq 1 30); do
  podman exec postgres pg_isready -U "$DB_USER" >/dev/null 2>&1 && break
  sleep 1
done

echo ">> backend (alembic + uvicorn)"
podman rm -f sentinelasm-backend >/dev/null 2>&1 || true
podman run -d --name sentinelasm-backend --network "$NET" -p "${API_PORT}:8000" \
  -v "${ARTIFACT_VOL}:${ARTIFACT_DIR}" \
  -e DATABASE_URL="$DB_URL" -e REDIS_URL="$REDIS_URL" -e SECRET_KEY="$SECRET_KEY" \
  -e AUTO_CREATE_TABLES=false -e CORS_ORIGINS="[\"http://localhost:${WEB_PORT}\"]" \
  sentinelasm-backend:latest \
  sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000" >/dev/null

echo ">> worker + beat"
podman rm -f sentinelasm-worker sentinelasm-beat >/dev/null 2>&1 || true
podman run -d --name sentinelasm-worker --network "$NET" \
  -v "${ARTIFACT_VOL}:${ARTIFACT_DIR}" \
  -e DATABASE_URL="$DB_URL" -e REDIS_URL="$REDIS_URL" -e SECRET_KEY="$SECRET_KEY" \
  "${SCAN_ENV[@]}" \
  sentinelasm-worker:latest \
  celery -A app.workers.celery_app worker -l info -Q discovery,fingerprint,vulnscan,report >/dev/null
podman run -d --name sentinelasm-beat --network "$NET" \
  -v "${ARTIFACT_VOL}:${ARTIFACT_DIR}" \
  -e DATABASE_URL="$DB_URL" -e REDIS_URL="$REDIS_URL" -e SECRET_KEY="$SECRET_KEY" \
  sentinelasm-worker:latest celery -A app.workers.celery_app beat -l info >/dev/null

echo ">> frontend"
podman rm -f sentinelasm-frontend >/dev/null 2>&1 || true
podman run -d --name sentinelasm-frontend --network "$NET" -p "${WEB_PORT}:3000" \
  -e NEXT_PUBLIC_API_URL="$API_URL" sentinelasm-frontend:latest >/dev/null

for i in $(seq 1 40); do
  [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$API_URL/health" || true)" == "200" ]] && break
  sleep 1
done

echo
echo "SentinelASM siap:"
echo "  Dashboard : http://localhost:${WEB_PORT}"
echo "  API docs  : ${API_URL}/docs"
echo "  Akun      : daftar lewat dashboard (email apa pun yang valid)"
