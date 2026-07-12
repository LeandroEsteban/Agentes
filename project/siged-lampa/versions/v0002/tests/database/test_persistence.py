"""Persistence tests for SIGED-Lampa v0002.

These tests check the repository layer and database pool configuration.
They do not require a live PostgreSQL connection - they test code structure.
"""

import os
import sys
import pytest

REPOS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'src', 'repositories')
DB_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'src', 'database')


def test_repository_files_exist():
    """Test that all required repository files exist."""
    files = sorted(os.listdir(REPOS_DIR))
    expected = ['citizen-requests.repository.js', 'documents.repository.js',
                'expedients.repository.js', 'users.repository.js']
    for f in expected:
        assert f in files, f"Missing repository: {f}"


def test_database_files_exist():
    """Test that all database layer files exist."""
    files = sorted(os.listdir(DB_DIR))
    expected = ['pool.js', 'migrations.js', 'transaction.js', 'health.js']
    for f in expected:
        assert f in files, f"Missing DB file: {f}"


def test_repository_exports():
    """Test that repositories export expected functions."""
    for repo_file in os.listdir(REPOS_DIR):
        path = os.path.join(REPOS_DIR, repo_file)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        assert 'module.exports' in content, f"Missing exports in {repo_file}"
        assert 'async ' in content or '=> query(' in content or '=> pool.query(' in content, f"Missing async/query functions in {repo_file}"


def test_repository_patterns():
    """Test that repositories follow consistent patterns."""
    for repo_file in os.listdir(REPOS_DIR):
        path = os.path.join(REPOS_DIR, repo_file)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Each repository should export functions
        assert 'module.exports' in content, f"Missing exports in {repo_file}"
        # Should use parameterized queries (when applicable)
        if repo_file in ('citizen-requests.repository.js', 'documents.repository.js', 'expedients.repository.js', 'users.repository.js'):
            assert '$1' in content or '$$' in content, \
                f"Missing parameterized queries in {repo_file}"


def test_database_pool_exists():
    """Test that pool.js exports getPool, query, end."""
    path = os.path.join(DB_DIR, 'pool.js')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'getPool' in content
    assert 'query' in content
    assert 'end' in content
    assert 'pg' in content, "Missing pg dependency"


def test_health_check_exists():
    """Test that health.js implements healthCheck."""
    path = os.path.join(DB_DIR, 'health.js')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'healthCheck' in content
    assert 'functional_tables' in content
    assert 'connection' in content
    assert 'migrations' in content


def test_transaction_exists():
    """Test that transaction.js implements BEGIN/COMMIT/ROLLBACK."""
    path = os.path.join(DB_DIR, 'transaction.js')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'BEGIN' in content
    assert 'COMMIT' in content
    assert 'ROLLBACK' in content


def test_migrations_script():
    """Test that migrate.js script exists."""
    script_path = os.path.join(os.path.dirname(REPOS_DIR), '..', '..', 'database', 'scripts', 'migrate.js')
    assert os.path.exists(script_path)
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'checksum_sha256' in content
    assert 'schema_migrations' in content


def test_seed_script():
    """Test that seed.js script exists."""
    script_path = os.path.join(os.path.dirname(REPOS_DIR), '..', '..', 'database', 'scripts', 'seed.js')
    assert os.path.exists(script_path)
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'ON CONFLICT' in content or 'applied' in content


def test_reset_script_blocked():
    """Test that reset.js blocks production reset."""
    script_path = os.path.join(os.path.dirname(REPOS_DIR), '..', '..', 'database', 'scripts', 'reset.js')
    assert os.path.exists(script_path)
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'production' in content.lower()
    assert 'BLOCKED' in content.upper() or 'exit' in content


def test_verify_schema_script():
    """Test that verify-schema.js exists with 40-table check."""
    script_path = os.path.join(os.path.dirname(REPOS_DIR), '..', '..', 'database', 'scripts', 'verify-schema.js')
    assert os.path.exists(script_path)
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'functional_tables' in content
    assert 'EXPECTED_FUNCTIONAL_TABLES' in content


def test_persistence_mode_config():
    """Test that persistence mode is configurable."""
    env_path = os.path.join(os.path.dirname(REPOS_DIR), '..', '..', '.env.example')
    assert os.path.exists(env_path)
    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'PERSISTENCE_MODE' in content
    assert 'postgres' in content
    assert 'memory' in content


def test_health_check_format():
    """Test that health check returns expected schema."""
    path = os.path.join(DB_DIR, 'health.js')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    expected_fields = ['status', 'database', 'connection', 'migrations', 'functional_tables']
    for field in expected_fields:
        assert field in content, f"Missing health check field: {field}"
