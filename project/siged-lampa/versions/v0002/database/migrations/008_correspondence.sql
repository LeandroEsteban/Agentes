CREATE TABLE correspondence (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(50) NOT NULL,
    direction VARCHAR(30) NOT NULL,
    subject VARCHAR(300) NOT NULL,
    received_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    priority VARCHAR(30) NOT NULL DEFAULT 'normal',
    status VARCHAR(30) NOT NULL DEFAULT 'received',
    origin_entity_id BIGINT NULL,
    document_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_correspondence_uuid ON correspondence(uuid);
CREATE UNIQUE INDEX idx_correspondence_tracking_code ON correspondence(tracking_code);
CREATE INDEX idx_correspondence_direction ON correspondence(direction);
CREATE INDEX idx_correspondence_priority ON correspondence(priority);
CREATE INDEX idx_correspondence_status ON correspondence(status);
CREATE INDEX idx_correspondence_received_at ON correspondence(received_at);

ALTER TABLE correspondence ADD CONSTRAINT fk_correspondence_origin_entity
    FOREIGN KEY (origin_entity_id) REFERENCES external_entities(id);
ALTER TABLE correspondence ADD CONSTRAINT fk_correspondence_document
    FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE correspondence ADD CONSTRAINT fk_correspondence_created_by
    FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE correspondence ADD CONSTRAINT ck_correspondence_direction
    CHECK (direction IN ('INBOUND', 'OUTBOUND'));
ALTER TABLE correspondence ADD CONSTRAINT ck_correspondence_priority
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE correspondence ADD CONSTRAINT ck_correspondence_status
    CHECK (status IN ('received', 'in_process', 'derived', 'responded', 'closed', 'cancelled'));

CREATE TABLE correspondence_recipients (
    id BIGSERIAL PRIMARY KEY,
    correspondence_id BIGINT NOT NULL,
    recipient_type VARCHAR(30) NOT NULL,
    external_entity_id BIGINT NULL,
    department_id BIGINT NULL,
    delivery_channel VARCHAR(30) DEFAULT 'internal',
    delivery_status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_correspondence_recipients_corr_id ON correspondence_recipients(correspondence_id);

ALTER TABLE correspondence_recipients ADD CONSTRAINT fk_correspondence_recipients_corr
    FOREIGN KEY (correspondence_id) REFERENCES correspondence(id);
ALTER TABLE correspondence_recipients ADD CONSTRAINT fk_correspondence_recipients_entity
    FOREIGN KEY (external_entity_id) REFERENCES external_entities(id);
ALTER TABLE correspondence_recipients ADD CONSTRAINT fk_correspondence_recipients_dept
    FOREIGN KEY (department_id) REFERENCES departments(id);

ALTER TABLE correspondence_recipients ADD CONSTRAINT ck_correspondence_recipients_type
    CHECK (recipient_type IN ('external', 'internal', 'cc'));
ALTER TABLE correspondence_recipients ADD CONSTRAINT ck_correspondence_recipients_channel
    CHECK (delivery_channel IN ('internal', 'email', 'physical', 'digital'));

CREATE TABLE correspondence_routes (
    id BIGSERIAL PRIMARY KEY,
    correspondence_id BIGINT NOT NULL,
    from_department_id BIGINT NOT NULL,
    to_department_id BIGINT NOT NULL,
    assigned_user_id BIGINT NULL,
    route_status VARCHAR(30) NOT NULL DEFAULT 'routed',
    routed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_correspondence_routes_corr_id ON correspondence_routes(correspondence_id);
CREATE INDEX idx_correspondence_routes_from_dept ON correspondence_routes(from_department_id);
CREATE INDEX idx_correspondence_routes_to_dept ON correspondence_routes(to_department_id);

ALTER TABLE correspondence_routes ADD CONSTRAINT fk_correspondence_routes_corr
    FOREIGN KEY (correspondence_id) REFERENCES correspondence(id);
ALTER TABLE correspondence_routes ADD CONSTRAINT fk_correspondence_routes_from_dept
    FOREIGN KEY (from_department_id) REFERENCES departments(id);
ALTER TABLE correspondence_routes ADD CONSTRAINT fk_correspondence_routes_to_dept
    FOREIGN KEY (to_department_id) REFERENCES departments(id);
ALTER TABLE correspondence_routes ADD CONSTRAINT fk_correspondence_routes_assigned
    FOREIGN KEY (assigned_user_id) REFERENCES users(id);

ALTER TABLE correspondence_routes ADD CONSTRAINT ck_correspondence_routes_diff_dept
    CHECK (from_department_id <> to_department_id);
