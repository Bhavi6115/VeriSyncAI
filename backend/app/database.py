import sqlite3
import json

from pathlib import Path
from datetime import datetime, timezone


# Store the database in the backend folder
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "verisync.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS verification_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            answer TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


def save_verification(answer: str, result: dict):
    connection = get_connection()

    created_at = datetime.now(timezone.utc).isoformat()

    cursor = connection.execute(
        """
        INSERT INTO verification_history
        (answer, result_json, created_at)
        VALUES (?, ?, ?)
        """,
        (
            answer,
            json.dumps(result, ensure_ascii=False),
            created_at
        )
    )

    record_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "id": record_id,
        "answer": answer,
        "result": result,
        "created_at": created_at
    }


def get_all_verifications(limit: int = 50, offset: int = 0):
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT id, answer, result_json, created_at
        FROM verification_history
        ORDER BY id DESC
        LIMIT ? OFFSET ?
        """,
        (limit, offset)
    ).fetchall()

    connection.close()

    return [
        {
            "id": row["id"],
            "answer": row["answer"],
            "result": json.loads(row["result_json"]),
            "created_at": row["created_at"]
        }
        for row in rows
    ]


def get_verification_by_id(record_id: int):
    connection = get_connection()

    row = connection.execute(
        """
        SELECT id, answer, result_json, created_at
        FROM verification_history
        WHERE id = ?
        """,
        (record_id,)
    ).fetchone()

    connection.close()

    if row is None:
        return None

    return {
        "id": row["id"],
        "answer": row["answer"],
        "result": json.loads(row["result_json"]),
        "created_at": row["created_at"]
    }


def delete_verification(record_id: int):
    connection = get_connection()

    cursor = connection.execute(
        "DELETE FROM verification_history WHERE id = ?",
        (record_id,)
    )

    connection.commit()
    deleted = cursor.rowcount > 0

    connection.close()

    return deleted


def clear_verification_history():
    connection = get_connection()

    connection.execute("DELETE FROM verification_history")
    connection.commit()

    connection.close()