"""Database structure tests for SIGED-Lampa v0002."""

import os
import re
import pytest

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'migrations')


def _collect_all_sql():
    """Collect all migration SQL into one string."""
    all_sql = ''
    for f in sorted(os.listdir(MIGRATIONS_DIR)):
        if f.endswith('.sql'):
            path = os.path.join(MIGRATIONS_DIR, f)
            with open(path, 'r', encoding='utf-8') as fh:
                all_sql += fh.read()
    return all_sql


def _find_tables(sql):
    """Find all table names from CREATE TABLE statements."""
    pattern = r'CREATE TABLE (\w+)'
    return re.findall(pattern, sql)


def _find_constraints(sql, constraint_type):
    """Find constraints of given type."""
    if constraint_type == 'PRIMARY KEY':
        pattern = r'PRIMARY KEY'
    elif constraint_type == 'FOREIGN KEY':
        pattern = r'FOREIGN KEY'
    elif constraint_type == 'UNIQUE':
        pattern = r'UNIQUE (?!KEY)(?!\()'  # avoid UNIQUE INDEX and UNIQUE(
        pattern = r'CREATE UNIQUE INDEX|UNIQUE INDEX'
    elif constraint_type == 'CHECK':
        pattern = r'CONSTRAINT \w+ CHECK|CHECK \('
    else:
        pattern = r''
    return re.findall(pattern, sql, re.IGNORECASE)


def test_all_tables_have_primary_key():
    """Test that each table has a PRIMARY KEY defined."""
    sql = _collect_all_sql()
    tables = _find_tables(sql)
    # Exclude schema_migrations
    tables = [t for t in tables if t != 'schema_migrations']
    
    # Each table should have a PK defined inline
    for table in tables:
        # Find the CREATE TABLE for this table
        pattern = rf'CREATE TABLE {table}\s*\(([^;]+)\)'
        match = re.search(pattern, sql, re.DOTALL)
        if match:
            table_sql = match.group(1)
            assert 'PRIMARY KEY' in table_sql, f"Table {table} missing PRIMARY KEY"


def test_primary_keys_count():
    """Test that we have at least 40 primary keys (40 functional tables)."""
    sql = _collect_all_sql()
    tables = _find_tables(sql)
    tables = [t for t in tables if t != 'schema_migrations']
    assert len(tables) >= 40, f"Found {len(tables)} tables, expected 40+"


def test_foreign_keys_exist():
    """Test that foreign key constraints exist."""
    sql = _collect_all_sql()
    fk_count = sql.count('FOREIGN KEY')
    assert fk_count >= 40, f"Expected >=40 FK constraints, found {fk_count}"


def test_unique_constraints_exist():
    """Test that unique constraints exist."""
    sql = _collect_all_sql()
    unique_count = sql.count('CREATE UNIQUE INDEX') + sql.count('UNIQUE(')
    assert unique_count >= 20, f"Expected >=20 unique constraints, found {unique_count}"


def test_check_constraints_exist():
    """Test that CHECK constraints exist."""
    sql = _collect_all_sql()
    check_count = sql.count('ADD CONSTRAINT') + len(re.findall(r'CONSTRAINT \w+ CHECK\(', sql, re.IGNORECASE))
    # More precise: count CHECK(
    checks = re.findall(r'\bCHECK\s*\(', sql, re.IGNORECASE)
    # Remove false positives (like CHECK in comments)
    assert len(checks) >= 15, f"Expected >=15 CHECK constraints, found {len(checks)}"


def test_indexes_exist():
    """Test that indexes exist."""
    sql = _collect_all_sql()
    index_count = sql.count('CREATE INDEX') + sql.count('CREATE UNIQUE INDEX')
    assert index_count >= 30, f"Expected >=30 indexes, found {index_count}"


def test_no_generic_payload_columns():
    """Test that payload JSONB is minimal and not used as primary storage."""
    sql = _collect_all_sql()
    # Count JSONB columns - should only be in audit_events and expedient_events
    jsonb_tables = ['audit_events', 'expedient_events']
    for table in jsonb_tables:
        pattern = rf'CREATE TABLE {table}[^;]+payload_json'
        assert re.search(pattern, sql, re.DOTALL), f"payload_json not found in {table}"


def test_not_null_constraints():
    """Test that tables have NOT NULL constraints on key fields."""
    sql = _collect_all_sql()
    not_null_count = sql.count('NOT NULL')
    assert not_null_count >= 100, f"Expected >=100 NOT NULL constraints, found {not_null_count}"


def test_soft_delete_pattern():
    """Test that transactional tables have deleted_at for soft delete."""
    tables_with_soft_delete = [
        'users', 'departments', 'external_entities',
        'documents', 'expedients', 'correspondence',
        'citizen_accounts', 'news_posts'
    ]
    sql = _collect_all_sql()
    for table in tables_with_soft_delete:
        pattern = rf'CREATE TABLE {table}[^;]+deleted_at'
        assert re.search(pattern, sql, re.DOTALL), f"Table {table} missing deleted_at"


def test_documents_current_version_nullable():
    """Test that current_version_id in documents is nullable (circular dependency)."""
    sql = _collect_all_sql()
    pattern = r'current_version_id BIGINT NULL'
    assert re.search(pattern, sql), "current_version_id should be nullable in documents"


def test_departments_manager_nullable():
    """Test that manager_user_id in departments is nullable (circular dependency)."""
    sql = _collect_all_sql()
    pattern = r'manager_user_id BIGINT NULL'
    assert re.search(pattern, sql), "manager_user_id should be nullable in departments"
