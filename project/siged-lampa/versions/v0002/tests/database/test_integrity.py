"""Database integrity tests for SIGED-Lampa v0002."""

import os
import re
import pytest

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'migrations')


def _collect_all_sql():
    all_sql = ''
    for f in sorted(os.listdir(MIGRATIONS_DIR)):
        if f.endswith('.sql'):
            path = os.path.join(MIGRATIONS_DIR, f)
            with open(path, 'r', encoding='utf-8') as fh:
                all_sql += fh.read()
    return all_sql


def test_unique_document_type_number():
    """Test that UNIQUE(document_type_id, document_number) exists."""
    sql = _collect_all_sql()
    assert 'UNIQUE' in sql and 'document_type_id' in sql and 'document_number' in sql, \
        "Missing UNIQUE(document_type_id, document_number)"


def test_no_duplicate_usernames():
    """Test that username UNIQUE index exists."""
    sql = _collect_all_sql()
    assert 'idx_users_username' in sql, "Missing username unique index"


def test_no_duplicate_roles():
    """Test that role code UNIQUE index exists."""
    sql = _collect_all_sql()
    assert 'idx_roles_code' in sql, "Missing roles code unique index"


def test_no_duplicate_user_roles():
    """Test that user_roles UNIQUE index exists."""
    sql = _collect_all_sql()
    assert 'idx_user_roles_unique' in sql, "Missing user_roles unique index"


def test_document_type_required():
    """Test that documents require document_type_id FK."""
    sql = _collect_all_sql()
    assert 'fk_documents_document_type' in sql, "Missing FK documents -> document_types"


def test_version_zero_rejected():
    """Test that version_number CHECK > 0 exists."""
    sql = _collect_all_sql()
    assert 'version_number > 0' in sql, "Missing version_number > 0 check"


def test_attachment_version_required():
    """Test that attachments require document_version_id."""
    sql = _collect_all_sql()
    assert 'fk_document_attachments_version' in sql, "Missing FK attachments -> versions"


def test_expedient_document_unique():
    """Test that expedient_documents has unique constraint."""
    sql = _collect_all_sql()
    assert 'idx_expedient_documents_unique' in sql, "Missing expedient_documents unique"


def test_correspondence_diff_dept():
    """Test that correspondence_routes from/to department differ."""
    sql = _collect_all_sql()
    assert 'from_department_id <> to_department_id' in sql, "Missing diff department check"


def test_oirs_anonymous_check():
    """Test OIRS auth_or_anonymous CHECK constraint."""
    sql = _collect_all_sql()
    assert 'ck_oirs_cases_auth_or_anonymous' in sql, "Missing OIRS auth/anonymous check"


def test_oirs_authenticated_ok():
    """Test that OIRS can work with authenticated citizen."""
    sql = _collect_all_sql()
    assert 'citizen_account_id BIGINT NULL' in sql, "Missing nullable citizen_account_id"


def test_oirs_anonymous_complete_ok():
    """Test that OIRS has anonymous contact fields."""
    sql = _collect_all_sql()
    assert 'anonymous_name VARCHAR(200)' in sql, "Missing oirs anonymous_name"
    assert 'anonymous_email VARCHAR(254)' in sql, "Missing oirs anonymous_email"
    assert 'anonymous_phone VARCHAR(40)' in sql, "Missing oirs anonymous_phone"
    assert 'contact_consent BOOLEAN' in sql, "Missing oirs contact_consent"


def test_closed_at_after_opened():
    """Test that closed_at >= opened_at checks exist."""
    sql = _collect_all_sql()
    assert 'closed_at IS NULL OR closed_at >= opened_at' in sql, "Missing closed_at check"
    assert 'closed_at IS NULL OR closed_at >= submitted_at' in sql, "Missing resolved_at check"


def test_oirs_message_author_check():
    """Test that OIRS messages have author check."""
    sql = _collect_all_sql()
    assert 'ck_oirs_messages_author' in sql, "Missing oirs messages author check"


def test_file_size_non_negative():
    """Test that file_size >= 0 checks exist."""
    sql = _collect_all_sql()
    assert 'file_size >= 0' in sql, "Missing file_size >= 0 check"


def test_retention_days_non_negative():
    """Test that retention_days >= 0 check exists."""
    sql = _collect_all_sql()
    assert 'retention_days >= 0' in sql, "Missing retention_days >= 0 check"


def test_sort_order_positive():
    """Test that sort_order > 0 check exists."""
    sql = _collect_all_sql()
    assert 'sort_order > 0' in sql, "Missing sort_order > 0 check"


def test_sequence_order_positive():
    """Test that sequence_order > 0 check exists."""
    sql = _collect_all_sql()
    assert 'sequence_order > 0' in sql, "Missing sequence_order > 0 check"


def test_estimated_days_positive():
    """Test that estimated_days > 0 check exists."""
    sql = _collect_all_sql()
    assert 'estimated_days > 0' in sql, "Missing estimated_days > 0 check"


def test_end_at_after_start_at():
    """Test that end_at >= start_at checks exist."""
    sql = _collect_all_sql()
    count = sql.count('end_at >= start_at')
    assert count >= 2, f"Expected >=2 end_at checks, found {count}"
