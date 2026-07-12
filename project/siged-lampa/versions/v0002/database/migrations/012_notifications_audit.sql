CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    channel VARCHAR(30) NOT NULL DEFAULT 'in_app',
    title VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    link_url VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    user_id BIGINT NULL,
    citizen_account_id BIGINT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_notifications_uuid ON notifications(uuid);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_citizen_unread ON notifications(citizen_account_id, is_read);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_citizen
    FOREIGN KEY (citizen_account_id) REFERENCES citizen_accounts(id);

ALTER TABLE notifications ADD CONSTRAINT ck_notifications_channel
    CHECK (channel IN ('in_app', 'email', 'sms', 'push'));
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_recipient
    CHECK (user_id IS NOT NULL OR citizen_account_id IS NOT NULL);

CREATE TABLE audit_events (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    actor_user_id BIGINT NULL,
    actor_citizen_id BIGINT NULL,
    ip_address VARCHAR(45),
    payload_json JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_audit_events_uuid ON audit_events(uuid);
CREATE INDEX idx_audit_events_module_date ON audit_events(module_code, occurred_at DESC);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_actor_user ON audit_events(actor_user_id);
CREATE INDEX idx_audit_events_actor_citizen ON audit_events(actor_citizen_id);
CREATE INDEX idx_audit_events_occurred_at ON audit_events(occurred_at);

ALTER TABLE audit_events ADD CONSTRAINT fk_audit_events_actor_user
    FOREIGN KEY (actor_user_id) REFERENCES users(id);
ALTER TABLE audit_events ADD CONSTRAINT fk_audit_events_actor_citizen
    FOREIGN KEY (actor_citizen_id) REFERENCES citizen_accounts(id);

ALTER TABLE audit_events ADD CONSTRAINT ck_audit_events_entity_type_not_null
    CHECK (entity_type IS NOT NULL AND length(trim(entity_type)) > 0);
ALTER TABLE audit_events ADD CONSTRAINT ck_audit_events_module_code_not_null
    CHECK (module_code IS NOT NULL AND length(trim(module_code)) > 0);
