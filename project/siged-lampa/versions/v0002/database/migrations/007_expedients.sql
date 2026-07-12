CREATE TABLE expedients (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    subject VARCHAR(300) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    department_id BIGINT NOT NULL,
    owner_user_id BIGINT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_expedients_uuid ON expedients(uuid);
CREATE UNIQUE INDEX idx_expedients_code ON expedients(code);
CREATE INDEX idx_expedients_department_id ON expedients(department_id);
CREATE INDEX idx_expedients_owner_user_id ON expedients(owner_user_id);
CREATE INDEX idx_expedients_status ON expedients(status);
CREATE INDEX idx_expedients_opened_at ON expedients(opened_at);

ALTER TABLE expedients ADD CONSTRAINT fk_expedients_department
    FOREIGN KEY (department_id) REFERENCES departments(id);
ALTER TABLE expedients ADD CONSTRAINT fk_expedients_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(id);

ALTER TABLE expedients ADD CONSTRAINT ck_expedients_status
    CHECK (status IN ('open', 'in_progress', 'closed', 'archived'));
ALTER TABLE expedients ADD CONSTRAINT ck_expedients_closed_at
    CHECK (closed_at IS NULL OR closed_at >= opened_at);

CREATE TABLE expedient_documents (
    id BIGSERIAL PRIMARY KEY,
    expedient_id BIGINT NOT NULL,
    document_id BIGINT NOT NULL,
    relation_type VARCHAR(30) NOT NULL DEFAULT 'related',
    linked_by BIGINT NOT NULL,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_expedient_documents_unique ON expedient_documents(expedient_id, document_id);
CREATE INDEX idx_expedient_documents_expedient_id ON expedient_documents(expedient_id);
CREATE INDEX idx_expedient_documents_document_id ON expedient_documents(document_id);

ALTER TABLE expedient_documents ADD CONSTRAINT fk_expedient_documents_expedient
    FOREIGN KEY (expedient_id) REFERENCES expedients(id);
ALTER TABLE expedient_documents ADD CONSTRAINT fk_expedient_documents_document
    FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE expedient_documents ADD CONSTRAINT fk_expedient_documents_linked_by
    FOREIGN KEY (linked_by) REFERENCES users(id);

ALTER TABLE expedient_documents ADD CONSTRAINT ck_expedient_documents_relation_type
    CHECK (relation_type IN ('related', 'generated', 'received', 'resolution'));

CREATE TABLE expedient_events (
    id BIGSERIAL PRIMARY KEY,
    expedient_id BIGINT NOT NULL,
    actor_user_id BIGINT NULL,
    document_id BIGINT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_label VARCHAR(200),
    payload_json JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expedient_events_expedient_id ON expedient_events(expedient_id);
CREATE INDEX idx_expedient_events_occurred_at ON expedient_events(expedient_id, occurred_at DESC);
CREATE INDEX idx_expedient_events_actor ON expedient_events(actor_user_id);

ALTER TABLE expedient_events ADD CONSTRAINT fk_expedient_events_expedient
    FOREIGN KEY (expedient_id) REFERENCES expedients(id);
ALTER TABLE expedient_events ADD CONSTRAINT fk_expedient_events_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id);
ALTER TABLE expedient_events ADD CONSTRAINT fk_expedient_events_document
    FOREIGN KEY (document_id) REFERENCES documents(id);
