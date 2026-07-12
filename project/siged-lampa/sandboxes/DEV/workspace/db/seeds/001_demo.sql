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
