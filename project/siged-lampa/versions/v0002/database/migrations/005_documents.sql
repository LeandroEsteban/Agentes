CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    document_type_id BIGINT NOT NULL,
    status_id BIGINT NOT NULL,
    owner_user_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,
    current_version_id BIGINT NULL,
    folio VARCHAR(100),
    document_number VARCHAR(100),
    title VARCHAR(300) NOT NULL,
    summary TEXT,
    confidentiality_level VARCHAR(30) NOT NULL DEFAULT 'public',
    origin_type VARCHAR(30) NOT NULL DEFAULT 'internal',
    due_date TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_documents_uuid ON documents(uuid);
CREATE UNIQUE INDEX idx_documents_folio ON documents(folio);
CREATE UNIQUE INDEX idx_documents_type_number ON documents(document_type_id, document_number);
CREATE INDEX idx_documents_status_id ON documents(status_id);
CREATE INDEX idx_documents_owner_user_id ON documents(owner_user_id);
CREATE INDEX idx_documents_department_id ON documents(department_id);
CREATE INDEX idx_documents_confidentiality_level ON documents(confidentiality_level);
CREATE INDEX idx_documents_due_date ON documents(due_date);
CREATE INDEX idx_documents_created_at ON documents(created_at);

ALTER TABLE documents ADD CONSTRAINT fk_documents_document_type
    FOREIGN KEY (document_type_id) REFERENCES document_types(id);
ALTER TABLE documents ADD CONSTRAINT fk_documents_status
    FOREIGN KEY (status_id) REFERENCES document_statuses(id);
ALTER TABLE documents ADD CONSTRAINT fk_documents_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(id);
ALTER TABLE documents ADD CONSTRAINT fk_documents_department
    FOREIGN KEY (department_id) REFERENCES departments(id);

ALTER TABLE documents ADD CONSTRAINT ck_documents_confidentiality_level
    CHECK (confidentiality_level IN ('public', 'internal', 'confidential', 'secret'));
ALTER TABLE documents ADD CONSTRAINT ck_documents_origin_type
    CHECK (origin_type IN ('internal', 'external', 'digital', 'physical'));

CREATE TABLE document_versions (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    previous_version_id BIGINT NULL,
    content_snapshot TEXT NOT NULL,
    change_summary TEXT,
    is_major BOOLEAN NOT NULL DEFAULT FALSE,
    author_user_id BIGINT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_document_versions_doc_version ON document_versions(document_id, version_number);
CREATE INDEX idx_document_versions_author ON document_versions(author_user_id);

ALTER TABLE document_versions ADD CONSTRAINT fk_document_versions_document
    FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE document_versions ADD CONSTRAINT fk_document_versions_author
    FOREIGN KEY (author_user_id) REFERENCES users(id);

ALTER TABLE document_versions ADD CONSTRAINT ck_document_versions_version_number
    CHECK (version_number > 0);

CREATE TABLE document_attachments (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    document_version_id BIGINT NOT NULL,
    file_name VARCHAR(300) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 VARCHAR(64),
    uploaded_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_attachments_document_id ON document_attachments(document_id);
CREATE INDEX idx_document_attachments_version_id ON document_attachments(document_version_id);
CREATE INDEX idx_document_attachments_uploaded_by ON document_attachments(uploaded_by);

ALTER TABLE document_attachments ADD CONSTRAINT fk_document_attachments_document
    FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE document_attachments ADD CONSTRAINT fk_document_attachments_version
    FOREIGN KEY (document_version_id) REFERENCES document_versions(id);
ALTER TABLE document_attachments ADD CONSTRAINT fk_document_attachments_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id);

ALTER TABLE document_attachments ADD CONSTRAINT ck_document_attachments_file_size
    CHECK (file_size >= 0);
