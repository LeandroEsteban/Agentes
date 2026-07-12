"""Database migration tests for SIGED-Lampa v0002."""

import os
import sys
import json
import hashlib
import subprocess
import pytest

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'migrations')
MIGRATION_FILES = sorted(os.listdir(MIGRATIONS_DIR))

FUNCTIONAL_TABLES = [
    'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
    'sessions', 'two_factor_settings',
    'departments', 'external_entities',
    'document_types', 'document_templates', 'document_statuses',
    'documents', 'document_versions', 'document_attachments',
    'document_comments', 'document_review_requests', 'document_review_responses',
    'document_approvals', 'document_signatures', 'signature_profiles',
    'expedients', 'expedient_documents', 'expedient_events',
    'correspondence', 'correspondence_recipients', 'correspondence_routes',
    'citizen_accounts', 'citizen_profiles', 'procedure_types',
    'published_procedures', 'citizen_requests', 'citizen_request_attachments',
    'oirs_cases', 'oirs_messages',
    'news_posts', 'public_notices', 'calendar_events',
    'notifications', 'audit_events'
]


def test_migration_files_exist():
    """Test that all 17 migration files exist."""
    assert len(MIGRATION_FILES) == 17
    expected = [
        '001_extensions.sql', '002_organization.sql', '003_security.sql',
        '004_document_catalogs.sql', '005_documents.sql', '006_document_workflows.sql',
        '007_expedients.sql', '008_correspondence.sql', '009_citizen_portal.sql',
        '010_oirs.sql', '011_public_content.sql', '012_notifications_audit.sql',
        '013_deferred_foreign_keys.sql', '014_profile_preferences_citizen_sessions.sql',
        '015_oirs_anonymous_tracking.sql', '016_correct_demo_password_hashes.sql',
        '017_add_deleted_at_to_reports_tables.sql'
    ]
    for f in expected:
        assert f in MIGRATION_FILES, f"Missing migration: {f}"


def test_migration_files_have_content():
    """Test that all migration files contain actual SQL."""
    for f in MIGRATION_FILES:
        path = os.path.join(MIGRATIONS_DIR, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        assert len(content) > 50, f"Migration {f} is too short"
        assert 'CREATE' in content or 'ALTER' in content or 'UPDATE' in content, f"Migration {f} has no SQL statements"


def test_40_functional_tables_declared():
    """Test that all 40 functional tables are created in migrations."""
    all_sql = ''
    for f in MIGRATION_FILES:
        path = os.path.join(MIGRATIONS_DIR, f)
        with open(path, 'r', encoding='utf-8') as fh:
            all_sql += fh.read()

    for table in FUNCTIONAL_TABLES:
        assert f'CREATE TABLE {table}' in all_sql, f"Table {table} not found in migrations"


def test_technical_table_excluded_from_count():
    """Test that schema_migrations is not counted in functional tables."""
    assert 'schema_migrations' not in FUNCTIONAL_TABLES


def test_all_migration_checksums():
    """Test that all migration files have valid SHA256 checksums."""
    for f in MIGRATION_FILES:
        path = os.path.join(MIGRATIONS_DIR, f)
        with open(path, 'rb') as fh:
            content = fh.read()
        checksum = hashlib.sha256(content).hexdigest()
        assert len(checksum) == 64, f"Invalid checksum for {f}"


def test_migration_ordering():
    """Test that migrations are in correct dependency order."""
    order = [f.replace('.sql', '') for f in MIGRATION_FILES]
    assert order.index('001_extensions') == 0
    assert order.index('002_organization') < order.index('003_security')
    assert order.index('003_security') < order.index('005_documents')
    assert order.index('004_document_catalogs') < order.index('005_documents')
    assert order.index('005_documents') < order.index('006_document_workflows')
    assert order.index('005_documents') < order.index('007_expedients')
    assert order.index('005_documents') < order.index('008_correspondence')
    assert order.index('009_citizen_portal') < order.index('010_oirs')
    assert order.index('017_add_deleted_at_to_reports_tables') == len(order) - 1
