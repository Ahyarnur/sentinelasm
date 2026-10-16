"""End-to-end smoke test: register -> login -> add target -> scan -> report.

Runs against SQLite with mock scanners so it needs no external services.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test_smoke.db")
os.environ.setdefault("AUTO_CREATE_TABLES", "true")
os.environ.setdefault("MOCK_SCANNERS", "true")
os.environ.setdefault("ENABLE_ENRICHMENT", "false")
os.environ.setdefault("SECRET_KEY", "test-secret")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.workers.tasks import run_full_scan  # noqa: E402


def test_end_to_end() -> None:
    if os.path.exists("./test_smoke.db"):
        os.remove("./test_smoke.db")

    with TestClient(app) as client:
        # register (ignore if already exists) then login
        client.post(
            "/api/v1/auth/register",
            json={"email": "t@e.com", "password": "password123"},
        )
        res = client.post(
            "/api/v1/auth/login",
            data={"username": "t@e.com", "password": "password123"},
        )
        assert res.status_code == 200, res.text
        headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

        # add target
        res = client.post(
            "/api/v1/targets", json={"domain": "example.com"}, headers=headers
        )
        assert res.status_code == 201, res.text
        target_id = res.json()["id"]

        # run pipeline synchronously (mock scanners)
        result = run_full_scan(target_id)
        assert result.get("assets", 0) > 0, result

        # dashboard reflects data
        res = client.get("/api/v1/dashboard/summary", headers=headers)
        assert res.status_code == 200
        assert res.json()["assets"] > 0

        # findings exist
        res = client.get("/api/v1/findings", headers=headers)
        assert res.status_code == 200
        assert len(res.json()) > 0

        # report renders inline
        res = client.get(f"/api/v1/reports/target/{target_id}", headers=headers)
        assert res.status_code == 200
        assert "Laporan Keamanan" in res.text

        # report artifact generation + download
        res = client.post(
            f"/api/v1/reports/target/{target_id}?kind=html", headers=headers
        )
        assert res.status_code == 201, res.text
        report_id = res.json()["id"]
        res = client.get(f"/api/v1/reports/{report_id}/download", headers=headers)
        assert res.status_code == 200
        assert "Laporan Keamanan" in res.text

        # scanner capability endpoint
        res = client.get("/api/v1/system/scanners", headers=headers)
        assert res.status_code == 200
        assert len(res.json()["scanners"]) == 11

    print("SMOKE OK")


if __name__ == "__main__":
    test_end_to_end()
