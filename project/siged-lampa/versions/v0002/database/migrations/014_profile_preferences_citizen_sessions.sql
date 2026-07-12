ALTER TABLE users
    ADD COLUMN phone VARCHAR(40),
    ADD COLUMN notification_email BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notification_web BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE citizen_sessions (
    id BIGSERIAL PRIMARY KEY,
    citizen_account_id BIGINT NOT NULL REFERENCES citizen_accounts(id),
    token_hash VARCHAR(256) NOT NULL UNIQUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_citizen_sessions_account ON citizen_sessions(citizen_account_id);
CREATE INDEX idx_citizen_sessions_expires_at ON citizen_sessions(expires_at);
