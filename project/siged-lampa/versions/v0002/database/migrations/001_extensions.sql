CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR PRIMARY KEY,
    checksum_sha256 VARCHAR NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    execution_ms BIGINT NOT NULL
);
