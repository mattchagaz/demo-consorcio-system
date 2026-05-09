"""Small SQLite store for conversion usage metrics."""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _default_db_path() -> Path:
    data_dir = Path("/data")
    if data_dir.exists():
        return data_dir / "conversions.sqlite3"
    return Path("/tmp/consorcio_conversions.sqlite3")


DB_PATH = Path(os.getenv("METRICS_DB_PATH", str(_default_db_path())))


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_metrics_store() -> None:
    with closing(_connect()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS conversion_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                created_date TEXT NOT NULL,
                action TEXT NOT NULL,
                user_email TEXT,
                uploaded_count INTEGER NOT NULL DEFAULT 0,
                parsed_count INTEGER NOT NULL DEFAULT 0,
                failed_count INTEGER NOT NULL DEFAULT 0,
                output_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                error_message TEXT,
                file_names TEXT NOT NULL DEFAULT '[]'
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conversion_jobs_created_at "
            "ON conversion_jobs(created_at DESC)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conversion_jobs_created_date "
            "ON conversion_jobs(created_date)"
        )
        conn.commit()


def record_conversion_job(
    *,
    action: str,
    uploaded_count: int = 0,
    parsed_count: int = 0,
    failed_count: int = 0,
    output_count: int = 0,
    status: str = "success",
    user_email: str | None = None,
    error_message: str | None = None,
    file_names: list[str] | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    safe_file_names = file_names or []
    with closing(_connect()) as conn:
        conn.execute(
            """
            INSERT INTO conversion_jobs (
                created_at,
                created_date,
                action,
                user_email,
                uploaded_count,
                parsed_count,
                failed_count,
                output_count,
                status,
                error_message,
                file_names
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now.isoformat(),
                now.date().isoformat(),
                action,
                _clean_user_email(user_email),
                uploaded_count,
                parsed_count,
                failed_count,
                output_count,
                status,
                error_message,
                json.dumps(safe_file_names[:100], ensure_ascii=False),
            ),
        )
        conn.commit()


def get_metrics_summary(limit: int = 20) -> dict[str, Any]:
    init_metrics_store()
    with closing(_connect()) as conn:
        totals = _bucket(
            conn.execute(
                """
                SELECT
                    COUNT(*) AS jobs,
                    COALESCE(SUM(uploaded_count), 0) AS uploaded_count,
                    COALESCE(SUM(parsed_count), 0) AS parsed_count,
                    COALESCE(SUM(failed_count), 0) AS failed_count,
                    COALESCE(SUM(output_count), 0) AS output_count,
                    COALESCE(SUM(CASE
                        WHEN action IN ('export', 'export_json') AND status = 'success'
                        THEN 1 ELSE 0 END), 0) AS excel_count
                FROM conversion_jobs
                """
            ).fetchone()
        )
        today = _bucket(
            conn.execute(
                """
                SELECT
                    COUNT(*) AS jobs,
                    COALESCE(SUM(uploaded_count), 0) AS uploaded_count,
                    COALESCE(SUM(parsed_count), 0) AS parsed_count,
                    COALESCE(SUM(failed_count), 0) AS failed_count,
                    COALESCE(SUM(output_count), 0) AS output_count,
                    COALESCE(SUM(CASE
                        WHEN action IN ('export', 'export_json') AND status = 'success'
                        THEN 1 ELSE 0 END), 0) AS excel_count
                FROM conversion_jobs
                WHERE created_date = ?
                """,
                (datetime.now(timezone.utc).date().isoformat(),),
            ).fetchone()
        )
        daily = [
            {"date": row["created_date"], **_bucket(row)}
            for row in conn.execute(
                """
                SELECT
                    created_date,
                    COUNT(*) AS jobs,
                    COALESCE(SUM(uploaded_count), 0) AS uploaded_count,
                    COALESCE(SUM(parsed_count), 0) AS parsed_count,
                    COALESCE(SUM(failed_count), 0) AS failed_count,
                    COALESCE(SUM(output_count), 0) AS output_count,
                    COALESCE(SUM(CASE
                        WHEN action IN ('export', 'export_json') AND status = 'success'
                        THEN 1 ELSE 0 END), 0) AS excel_count
                FROM conversion_jobs
                GROUP BY created_date
                ORDER BY created_date DESC
                LIMIT 14
                """
            ).fetchall()
        ]
        recent_jobs = [_job(row) for row in conn.execute(
            """
            SELECT
                id,
                created_at,
                action,
                user_email,
                uploaded_count,
                parsed_count,
                failed_count,
                output_count,
                status,
                error_message,
                file_names
            FROM conversion_jobs
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()]

    return {
        "db_path": str(DB_PATH),
        "totals": totals,
        "today": today,
        "daily": daily,
        "recent_jobs": recent_jobs,
    }


def _bucket(row: sqlite3.Row | None) -> dict[str, int]:
    if row is None:
        return {
            "jobs": 0,
            "uploaded_count": 0,
            "parsed_count": 0,
            "failed_count": 0,
            "output_count": 0,
            "excel_count": 0,
        }
    return {
        "jobs": int(row["jobs"] or 0),
        "uploaded_count": int(row["uploaded_count"] or 0),
        "parsed_count": int(row["parsed_count"] or 0),
        "failed_count": int(row["failed_count"] or 0),
        "output_count": int(row["output_count"] or 0),
        "excel_count": int(row["excel_count"] or 0),
    }


def _job(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "action": row["action"],
        "user_email": row["user_email"],
        "uploaded_count": row["uploaded_count"],
        "parsed_count": row["parsed_count"],
        "failed_count": row["failed_count"],
        "output_count": row["output_count"],
        "status": row["status"],
        "error_message": row["error_message"],
        "file_names": _decode_file_names(row["file_names"]),
    }


def _decode_file_names(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return [name for name in parsed if isinstance(name, str)]


def _clean_user_email(user_email: str | None) -> str | None:
    if not user_email:
        return None
    cleaned = user_email.strip().lower()
    return cleaned or None
