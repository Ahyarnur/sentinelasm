# Development SentinelASM

## Setup tanpa Docker

Butuh Python 3.12+ dan (opsional) PostgreSQL + Redis.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Untuk uji cepat tanpa Postgres/Redis, pakai SQLite:

```bash
export DATABASE_URL="sqlite+pysqlite:///./dev.db"
export AUTO_CREATE_TABLES=true
export MOCK_SCANNERS=true
uvicorn app.main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## Test & lint

```bash
make test        # smoke test end-to-end (SQLite + mock)
cd backend && pytest          # semua test
cd backend && ruff check .    # lint
cd backend && ruff format .   # format
```

## Struktur & konvensi

- Backend: FastAPI + SQLAlchemy 2 (typed) + Pydantic v2. Konfigurasi lewat `app/core/config.py`
  (env var, prefix tanpa namespace).
- Tambah scanner baru: buat adapter di `app/scanners/`, daftarkan di `registry.py`,
  implementasikan kontrak di `app/scanners/base.py`.
- Frontend: App Router, komponen di `components/`, tipe di `lib/types.ts`, akses API lewat
  `lib/api.ts`.
- Migrasi DB: `cd backend && alembic revision --autogenerate -m "pesan"`.

## Menambah adapter scanner

```python
from app.scanners.base import ScannerAdapter

class MyScanner(ScannerAdapter):
    name = "myscanner"
    def run(self, target): ...
```

Daftarkan di `DISCOVERY_SCANNERS` / `PROBE_SCANNERS` / `VULN_SCANNERS` / `ACTIVE_SCANNERS`
sesuai tahapnya.
