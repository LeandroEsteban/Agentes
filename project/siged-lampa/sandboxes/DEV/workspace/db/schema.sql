-- SIGED-Lampa initial schema generated from authorized SIGED markdown sources.

CREATE TABLE IF NOT EXISTS roles (code TEXT PRIMARY KEY, name TEXT NOT NULL, surface TEXT NOT NULL CHECK (surface IN ('intranet', 'portal')), created_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS users (id BIGSERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, password_hash TEXT NOT NULL, role_code TEXT NOT NULL REFERENCES roles(code), surface TEXT NOT NULL CHECK (surface IN ('intranet', 'portal')), department TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS documents (id BIGSERIAL PRIMARY KEY, folio TEXT NOT NULL UNIQUE, title TEXT NOT NULL, type TEXT NOT NULL, department TEXT NOT NULL, status TEXT NOT NULL, owner_username TEXT REFERENCES users(username), due_date DATE, created_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS expedients (id BIGSERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, subject TEXT NOT NULL, status TEXT NOT NULL, owner_department TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS citizen_requests (id BIGSERIAL PRIMARY KEY, tracking TEXT NOT NULL UNIQUE, subject TEXT NOT NULL, status TEXT NOT NULL, channel TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS audit_events (id BIGSERIAL PRIMARY KEY, actor_username TEXT, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW());

CREATE TABLE IF NOT EXISTS permissions (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS user_roles (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS role_permissions (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS sessions (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS two_factor_settings (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS departments (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS external_entities (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_types (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_templates (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_statuses (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_versions (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_attachments (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_comments (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_review_requests (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_review_responses (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_approvals (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_signatures (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS signature_profiles (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS expedient_documents (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS expedient_events (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS correspondence (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS correspondence_recipients (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS correspondence_routes (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS citizen_accounts (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS citizen_profiles (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS procedure_types (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS published_procedures (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS citizen_request_attachments (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS oirs_cases (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS oirs_messages (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS news_posts (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public_notices (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS calendar_events (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS notifications (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());

-- Demo seed. Passwords are placeholders for DEV only.
INSERT INTO roles (code, name, surface) VALUES
  ('ADMIN', 'Administrador', 'intranet'),
  ('FUNC', 'Funcionario municipal', 'intranet'),
  ('OF_PARTES', 'Oficina de partes', 'intranet'),
  ('REVISOR', 'Revisor o jefatura', 'intranet'),
  ('OIRS', 'Operador OIRS', 'intranet'),
  ('REPORTES', 'Analista de reportes', 'intranet'),
  ('CIUDADANO', 'Usuario ciudadano', 'portal')
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (username, email, full_name, password_hash, role_code, surface, department) VALUES
  ('admin.lampa', 'admin@lampa.cl', 'Marcela Torres', 'dev_hash_demo123', 'ADMIN', 'intranet', 'Administracion Municipal'),
  ('funcionario.dom', 'lperez@lampa.cl', 'Luis Perez', 'dev_hash_demo123', 'FUNC', 'intranet', 'Direccion de Obras'),
  ('partes', 'partes@lampa.cl', 'Ana Rojas', 'dev_hash_demo123', 'OF_PARTES', 'intranet', 'Oficina de Partes'),
  ('revisor.secmun', 'rsilva@lampa.cl', 'Roberto Silva', 'dev_hash_demo123', 'REVISOR', 'intranet', 'Secretaria Municipal'),
  ('oirs.operador', 'csoto@lampa.cl', 'Carolina Soto', 'dev_hash_demo123', 'OIRS', 'intranet', 'OIRS'),
  ('vecino.demo', 'vecino@correo.cl', 'Vecino Demo', 'dev_hash_vecino123', 'CIUDADANO', 'portal', 'Portal ciudadano')
ON CONFLICT (username) DO NOTHING;

INSERT INTO documents (folio, title, type, department, status, owner_username, due_date) VALUES
  ('DOC-2026-0001', 'Decreto alcaldicio', 'Decreto', 'Secretaria Municipal', 'En revision', 'partes', '2026-07-12'),
  ('DOC-2026-0002', 'Memo Direccion de Obras', 'Memo', 'DOM', 'Borrador', 'funcionario.dom', '2026-07-15')
ON CONFLICT (folio) DO NOTHING;
