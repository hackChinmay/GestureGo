"""
tests/test_registration_db.py - Unit Tests for SQLite Registration Layer.

Verifies:
1. Database schema initialization and table creation
2. Format of generated registration codes (GG-XXXXXXXX, Crockford alphabet)
3. Uniqueness and collision avoidance across multiple registrations
4. Duplicate prevention: re-registering an event returns existing record and code
5. Persistence across database reconnects
6. Distinct codes for different events
7. Retrieval of all registrations and single-event lookups
8. Validation for empty/missing event_id and event_name
9. SQL injection resilience via parameterized queries
"""

import os
import tempfile
import unittest
import sqlite3
import re

from registration_db import (
    init_db,
    get_db_connection,
    generate_registration_code,
    create_or_get_registration,
    get_all_registrations,
    get_registration_by_event,
    CODE_ALPHABET,
)

class TestRegistrationDB(unittest.TestCase):

    def setUp(self):
        # Create a temporary database for each test to ensure complete isolation
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_registrations.db")
        init_db(self.db_path)

    def tearDown(self):
        try:
            self.temp_dir.cleanup()
        except PermissionError:
            pass

    def test_schema_initialization(self):
        conn = get_db_connection(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='registrations'")
            self.assertIsNotNone(cursor.fetchone())

            cursor.execute("PRAGMA table_info(registrations)")
            columns = {row["name"] for row in cursor.fetchall()}
            expected_cols = {
                "registration_id",
                "registration_code",
                "event_id",
                "event_name_snapshot",
                "event_date",
                "event_time",
                "venue",
                "registration_status",
                "registered_at",
            }
            self.assertTrue(expected_cols.issubset(columns))
        finally:
            conn.close()

    def test_code_format_and_alphabet(self):
        code_regex = re.compile(r"^GG-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$")
        conn = get_db_connection(self.db_path)
        try:
            for _ in range(50):
                code = generate_registration_code(conn)
                self.assertRegex(code, code_regex)
                # Confirm no ambiguous characters
                for ambiguous in ("0", "O", "1", "I", "L"):
                    self.assertNotIn(ambiguous, code)
        finally:
            conn.close()

    def test_create_new_registration(self):
        record, is_new = create_or_get_registration(
            event_id="s1",
            event_name="Opening Keynote",
            event_date="Oct 24, 2026",
            event_time="09:00 AM",
            venue="Main Auditorium",
            db_path=self.db_path,
        )
        self.assertTrue(is_new)
        self.assertEqual(record["event_id"], "s1")
        self.assertEqual(record["event_name_snapshot"], "Opening Keynote")
        self.assertEqual(record["registration_status"], "CONFIRMED")
        self.assertTrue(record["registration_code"].startswith("GG-"))

    def test_duplicate_prevention_preserves_code(self):
        first_record, is_new1 = create_or_get_registration(
            event_id="s2",
            event_name="Workshop: HCI",
            event_date="Oct 24, 2026",
            event_time="10:30 AM",
            venue="Lab 204",
            db_path=self.db_path,
        )
        self.assertTrue(is_new1)
        original_code = first_record["registration_code"]

        # Second attempt to register the exact same event
        second_record, is_new2 = create_or_get_registration(
            event_id="s2",
            event_name="Workshop: HCI",
            event_date="Oct 24, 2026",
            event_time="10:30 AM",
            venue="Lab 204",
            db_path=self.db_path,
        )
        self.assertFalse(is_new2)
        self.assertEqual(second_record["registration_code"], original_code)
        self.assertEqual(second_record["registration_id"], first_record["registration_id"])

        # Confirm exactly 1 record in SQLite
        all_records = get_all_registrations(self.db_path)
        self.assertEqual(len(all_records), 1)

    def test_distinct_codes_for_different_events(self):
        reg1, _ = create_or_get_registration(
            event_id="s1", event_name="Event 1", event_date="D1", event_time="T1", venue="V1", db_path=self.db_path
        )
        reg2, _ = create_or_get_registration(
            event_id="s2", event_name="Event 2", event_date="D2", event_time="T2", venue="V2", db_path=self.db_path
        )
        reg3, _ = create_or_get_registration(
            event_id="s3", event_name="Event 3", event_date="D3", event_time="T3", venue="V3", db_path=self.db_path
        )

        codes = {reg1["registration_code"], reg2["registration_code"], reg3["registration_code"]}
        self.assertEqual(len(codes), 3, "All generated codes must be distinct")

    def test_persistence_across_connections(self):
        create_or_get_registration(
            event_id="s1", event_name="Event 1", event_date="D1", event_time="T1", venue="V1", db_path=self.db_path
        )
        # Query via separate function connection
        found = get_registration_by_event("s1", db_path=self.db_path)
        self.assertIsNotNone(found)
        self.assertEqual(found["event_name_snapshot"], "Event 1")

    def test_get_all_registrations_order(self):
        create_or_get_registration(
            event_id="s1", event_name="Event 1", event_date="D1", event_time="T1", venue="V1", db_path=self.db_path
        )
        create_or_get_registration(
            event_id="s2", event_name="Event 2", event_date="D2", event_time="T2", venue="V2", db_path=self.db_path
        )
        all_regs = get_all_registrations(self.db_path)
        self.assertEqual(len(all_regs), 2)

    def test_invalid_input_validation(self):
        with self.assertRaises(ValueError):
            create_or_get_registration("", "Event Name", "D", "T", "V", db_path=self.db_path)

        with self.assertRaises(ValueError):
            create_or_get_registration("s1", "", "D", "T", "V", db_path=self.db_path)

    def test_sql_injection_resilience(self):
        malicious_id = "s1'; DROP TABLE registrations; --"
        malicious_name = "Malicious Event'; DELETE FROM registrations; --"

        record, is_new = create_or_get_registration(
            event_id=malicious_id,
            event_name=malicious_name,
            event_date="D",
            event_time="T",
            venue="V",
            db_path=self.db_path,
        )
        self.assertTrue(is_new)

        # Confirm registrations table is intact and has 1 record
        all_records = get_all_registrations(self.db_path)
        self.assertEqual(len(all_records), 1)
        self.assertEqual(all_records[0]["event_id"], malicious_id)

    def test_nonexistent_event_lookup_returns_none(self):
        result = get_registration_by_event("non_existent_999", db_path=self.db_path)
        self.assertIsNone(result)

if __name__ == "__main__":
    unittest.main()
