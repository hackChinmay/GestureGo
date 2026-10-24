"""
registration_db.py - SQLite Persistence Layer for GestureGo Event Registrations.

Implements secure, parameterized SQLite persistence for touchless kiosk event registrations.
Enforces uniqueness constraints per event to prevent duplicate registrations and generates
cryptographically random collision-free human-readable pass codes (GG-XXXXXXXX).
"""

import os
import sqlite3
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

DB_PATH_DEFAULT = "data/registrations.db"

# 32-character alphabet omitting visually ambiguous characters (0, O, 1, I, L)
CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

def get_db_connection(db_path: str = DB_PATH_DEFAULT) -> sqlite3.Connection:
    """Creates directory if needed and returns a connection with Row factory enabled."""
    os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else ".", exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path: str = DB_PATH_DEFAULT) -> None:
    """Initializes the registrations table and indices with uniqueness constraints."""
    conn = get_db_connection(db_path)
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS registrations (
                    registration_id TEXT PRIMARY KEY,
                    registration_code TEXT UNIQUE NOT NULL,
                    event_id TEXT UNIQUE NOT NULL,
                    event_name_snapshot TEXT NOT NULL,
                    event_date TEXT NOT NULL,
                    event_time TEXT NOT NULL,
                    venue TEXT NOT NULL,
                    registration_status TEXT NOT NULL DEFAULT 'CONFIRMED',
                    registered_at TEXT NOT NULL
                );
                """
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_reg_event_id ON registrations(event_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_reg_code ON registrations(registration_code);")
    finally:
        conn.close()

def generate_registration_code(conn: sqlite3.Connection, max_attempts: int = 100) -> str:
    """Generates a collision-free code in the format GG-XXXXXXXX."""
    cursor = conn.cursor()
    for _ in range(max_attempts):
        suffix = "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))
        code = f"GG-{suffix}"
        cursor.execute("SELECT 1 FROM registrations WHERE registration_code = ? LIMIT 1", (code,))
        if cursor.fetchone() is None:
            return code

    # Fallback with timestamp if all random attempts collide
    fallback = datetime.now(timezone.utc).strftime("%f%S%M")[:8].upper()
    return f"GG-{fallback}"

def create_or_get_registration(
    event_id: str,
    event_name: str,
    event_date: str,
    event_time: str,
    venue: str,
    db_path: str = DB_PATH_DEFAULT,
) -> Tuple[Dict[str, Any], bool]:
    """
    Registers an event pass using parameterized queries.
    Returns (registration_dict, is_new).
    If already registered, returns the existing record without generating a new code.
    """
    if not event_id or not event_name:
        raise ValueError("Invalid event data: event_id and event_name are required.")

    init_db(db_path)
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()

        # 1. Check for existing registration
        cursor.execute("SELECT * FROM registrations WHERE event_id = ?", (event_id,))
        existing = cursor.fetchone()
        if existing:
            return dict(existing), False

        # 2. Generate unique code and insert new record
        reg_id = f"reg_{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(3)}"
        code = generate_registration_code(conn)
        now_iso = datetime.now(timezone.utc).isoformat()

        try:
            with conn:
                cursor.execute(
                    """
                    INSERT INTO registrations (
                        registration_id,
                        registration_code,
                        event_id,
                        event_name_snapshot,
                        event_date,
                        event_time,
                        venue,
                        registration_status,
                        registered_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        reg_id,
                        code,
                        event_id,
                        event_name,
                        event_date,
                        event_time,
                        venue,
                        "CONFIRMED",
                        now_iso,
                    ),
                )

            cursor.execute("SELECT * FROM registrations WHERE registration_id = ?", (reg_id,))
            new_record = cursor.fetchone()
            return dict(new_record), True
        except sqlite3.IntegrityError:
            # Concurrency safeguard: fetch the conflicting record
            cursor.execute("SELECT * FROM registrations WHERE event_id = ?", (event_id,))
            record = cursor.fetchone()
            if record:
                return dict(record), False
            raise
    finally:
        conn.close()

def get_all_registrations(db_path: str = DB_PATH_DEFAULT) -> List[Dict[str, Any]]:
    """Returns all stored registrations sorted newest first."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM registrations ORDER BY registered_at DESC")
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_registration_by_event(event_id: str, db_path: str = DB_PATH_DEFAULT) -> Optional[Dict[str, Any]]:
    """Returns registration dict for a specific event_id or None."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM registrations WHERE event_id = ?", (event_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
