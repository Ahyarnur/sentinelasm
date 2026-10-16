# SentinelASM — helper tasks
#
# Compose berada di deploy/ (lihat PLAN_ASM.md §5), jadi semua target compose
# memakai -f tersebut. .env dibaca dari root repo.

COMPOSE_FILE ?= deploy/docker-compose.yml
ENV_FILE     ?= .env
COMPOSE      ?= docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE)

.PHONY: help up up-server down build rebuild logs ps shell-api shell-db test fmt lint proxy-up clean

help: ## Tampilkan daftar target
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Nyalakan stack lengkap lokal (backend + DB + frontend)
	$(COMPOSE) --profile web up -d --build

up-server: ## Nyalakan backend + DB saja (untuk server produksi / tanpa frontend)
	$(COMPOSE) up -d --build

down: ## Hentikan dan hapus container
	$(COMPOSE) down

build: ## Build ulang image
	$(COMPOSE) build

rebuild: ## Build ulang tanpa cache
	$(COMPOSE) build --no-cache

logs: ## Ikuti log semua service
	$(COMPOSE) logs -f --tail=100

ps: ## Status container
	$(COMPOSE) ps

proxy-up: ## Nyalakan termasuk reverse proxy nginx (butuh frontend)
	$(COMPOSE) --profile web --profile proxy up -d --build

shell-api: ## Shell ke container backend
	$(COMPOSE) exec backend sh

shell-db: ## Masuk psql
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-sentinel} -d $${POSTGRES_DB:-sentinelasm}

PYTHON ?= $(shell [ -x backend/.venv/bin/python ] && echo $$PWD/backend/.venv/bin/python || echo python3)

venv: ## Buat venv backend + pasang dependensi
	cd backend && python3 -m venv .venv && .venv/bin/pip install -U pip && .venv/bin/pip install -r requirements.txt

test: ## Jalankan smoke test backend (SQLite + mock, tanpa Docker)
	cd backend && PYTHONPATH=. $(PYTHON) tests/test_smoke.py

typecheck: ## Typecheck frontend (tsc --noEmit)
	cd frontend && npx tsc --noEmit

fmt: ## Format Python dengan ruff (bila terpasang)
	cd backend && ruff format . && ruff check --fix .

lint: ## Lint Python dengan ruff (bila terpasang)
	cd backend && ruff check .

clean: ## Hentikan stack + hapus volume (data hilang!)
	$(COMPOSE) down -v
