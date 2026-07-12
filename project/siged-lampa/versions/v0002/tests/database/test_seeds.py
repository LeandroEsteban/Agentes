"""Seed data tests for SIGED-Lampa v0002."""

import os
import pytest

SEEDS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'seeds')


def _read_seed(name):
    path = os.path.join(SEEDS_DIR, name)
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def test_seed_files_exist():
    """Test that all 5 seed files exist."""
    files = sorted(os.listdir(SEEDS_DIR))
    assert len(files) == 5
    expected = ['001_catalogs.sql', '002_roles_permissions.sql',
                '003_departments.sql', '004_demo_data.sql',
                '005_procedure_catalogs.sql']
    for f in expected:
        assert f in files, f"Missing seed file: {f}"


def test_seed_reproducible():
    """Test that seeds use ON CONFLICT DO NOTHING for idempotency."""
    for f in sorted(os.listdir(SEEDS_DIR)):
        content = _read_seed(f)
        assert 'ON CONFLICT' in content, f"Seed {f} missing ON CONFLICT"


def test_roles_seeded():
    """Test that roles are seeded."""
    content = _read_seed('002_roles_permissions.sql')
    assert 'admin' in content
    assert 'officer' in content
    assert 'reviewer' in content
    assert 'signer' in content
    assert 'viewer' in content


def test_permissions_seeded():
    """Test that permissions are seeded."""
    content = _read_seed('002_roles_permissions.sql')
    assert 'users.view' in content
    assert 'documents.create' in content
    assert 'expedients.view' in content
    assert 'oirs.respond' in content
    assert 'admin.access' in content


def test_departments_seeded():
    """Test that departments are seeded."""
    content = _read_seed('003_departments.sql')
    assert 'SECRETARIA' in content
    assert 'RENTAS' in content
    assert 'TRANSITO' in content
    assert 'JURIDICO' in content
    assert 'OBRAS' in content


def test_demo_admin_user():
    """Test that demo admin user exists."""
    content = _read_seed('004_demo_data.sql')
    assert 'admin' in content
    assert 'admin@lampa.cl' in content
    assert 'Administrador' in content


def test_demo_officer_user():
    """Test that demo officer user exists."""
    content = _read_seed('004_demo_data.sql')
    assert 'funcionario' in content
    assert 'funcionario@lampa.cl' in content


def test_demo_citizen():
    """Test that demo citizen account exists."""
    content = _read_seed('004_demo_data.sql')
    assert 'ciudadano@email.com' in content
    assert 'Ciudadano Demo' in content


def test_no_production_secrets():
    """Test that seeds don't contain production passwords."""
    content = _read_seed('004_demo_data.sql')
    assert 'admin123' not in content or '$2b$' in content
    assert 'PASSWORD' not in content.upper() or 'DEMO' in content.upper()


def test_document_statuses_seeded():
    """Test that document statuses are seeded."""
    content = _read_seed('001_catalogs.sql')
    assert 'draft' in content
    assert 'published' in content
    assert 'archived' in content


def test_document_types_seeded():
    """Test that document types are seeded."""
    content = _read_seed('001_catalogs.sql')
    assert 'MEMO' in content
    assert 'DECREE' in content
    assert 'RESOLUTION' in content
    assert 'LETTER' in content


def test_procedure_types_seeded():
    """Test that procedure types are seeded."""
    content = _read_seed('001_catalogs.sql')
    assert 'CERT_RESIDENCIA' in content
    assert 'LICENCIA_CONDUCIR' in content
    assert 'PATENTE_COMERCIAL' in content


def test_demo_credentials_not_production():
    """Test that demo credentials are clearly identified as demo."""
    env_path = os.path.join(os.path.dirname(SEEDS_DIR), '..', '.env.example')
    with open(env_path, 'r', encoding='utf-8') as f:
        env_content = f.read()
    assert 'DEMO' in env_content, "Missing DEMO_ prefix in env example"
