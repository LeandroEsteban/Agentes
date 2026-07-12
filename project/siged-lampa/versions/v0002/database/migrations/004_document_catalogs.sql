CREATE TABLE document_types (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    retention_days INT NOT NULL DEFAULT 0,
    requires_signature BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_document_types_uuid ON document_types(uuid);
CREATE UNIQUE INDEX idx_document_types_code ON document_types(code);

ALTER TABLE document_types ADD CONSTRAINT ck_document_types_retention_days
    CHECK (retention_days >= 0);

CREATE TABLE document_templates (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    document_type_id BIGINT NOT NULL,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    template_path VARCHAR(500) NOT NULL,
    version_label VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_document_templates_uuid ON document_templates(uuid);
CREATE UNIQUE INDEX idx_document_templates_code ON document_templates(code);
CREATE INDEX idx_document_templates_document_type_id ON document_templates(document_type_id);

ALTER TABLE document_templates ADD CONSTRAINT fk_document_templates_type
    FOREIGN KEY (document_type_id) REFERENCES document_types(id);

CREATE TABLE document_statuses (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_document_statuses_uuid ON document_statuses(uuid);
CREATE UNIQUE INDEX idx_document_statuses_code ON document_statuses(code);

ALTER TABLE document_statuses ADD CONSTRAINT ck_document_statuses_sort_order
    CHECK (sort_order > 0);
