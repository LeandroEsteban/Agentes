ALTER TABLE oirs_cases ADD COLUMN anonymous_tracking_hash VARCHAR(64);
ALTER TABLE oirs_messages ADD COLUMN anonymous_tracking_hash VARCHAR(64);

ALTER TABLE oirs_messages DROP CONSTRAINT ck_oirs_messages_author;
ALTER TABLE oirs_messages ADD CONSTRAINT ck_oirs_messages_author
    CHECK (
        (author_user_id IS NOT NULL)::int +
        (author_citizen_id IS NOT NULL)::int +
        (anonymous_tracking_hash IS NOT NULL)::int = 1
    );

CREATE INDEX idx_oirs_cases_anonymous_tracking_hash ON oirs_cases(anonymous_tracking_hash);
